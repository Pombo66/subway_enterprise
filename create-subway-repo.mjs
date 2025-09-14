// create-subway-repo.mjs — FULL GENERATOR (writes files only; no auto-run)
import { mkdirSync, writeFileSync } from "fs";
import path from "path";

const W=(p,c)=>{ mkdirSync(path.dirname(p),{recursive:true}); writeFileSync(p,c); };

// ---------- ROOT ----------
W("package.json", JSON.stringify({
  name:"subway-enterprise",
  private:true,
  packageManager:"pnpm@9.1.0",
  scripts:{
    dev:"turbo run dev --parallel",
    build:"turbo run build",
    lint:"turbo run lint",
    typecheck:"turbo run typecheck",
    test:"turbo run test",
    "test:smoke":"node scripts/smoke.mjs"
  },
  devDependencies:{ turbo:"2.0.6", typescript:"5.5.4" }
}, null, 2));

W("pnpm-workspace.yaml","packages:\n  - apps/*\n  - packages/*\n  - infra/*\n");
W(".nvmrc","20.19.5\n");
W(".npmrc","engine-strict=true\n");
W(".gitignore","node_modules\n.DS_Store\n.env*\napps/**/.next\ndist\ncoverage\n");
W("turbo.json", JSON.stringify({$schema:"https://turbo.build/schema.json",pipeline:{
  build:{dependsOn:["^build"],outputs:["dist/**",".next/**"]},
  dev:{cache:false,persistent:true}, lint:{}, typecheck:{}, test:{}
}}, null, 2));
W(".env.example","DATABASE_URL=postgresql://postgres:postgres@localhost:5432/subway?schema=public\nNEXT_PUBLIC_BFF_URL=http://localhost:3001\n");
W("README.md",
`# Subway Enterprise Baseline

## Run order (after files are generated)
1) corepack enable && pnpm install
2) docker compose -f infra/docker/compose.dev.yaml up -d
3) pnpm -C packages/db prisma:generate && pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:seed
4) pnpm -C apps/bff dev   (http://localhost:3001/healthz)
5) pnpm -C apps/admin dev (http://localhost:3002/dashboard)
`);

// ---------- DEVCONTAINER + DOCKER ----------
W(".devcontainer/devcontainer.json", JSON.stringify({
  name:"subway-enterprise",
  dockerComposeFile:["../infra/docker/compose.dev.yaml"],
  service:"workspace",
  workspaceFolder:"/workspace",
  customizations:{ vscode:{ extensions:["ms-vscode.vscode-typescript-next","esbenp.prettier-vscode"] } }
}, null, 2));

W("infra/docker/compose.dev.yaml", `
services:
  db:
    image: postgres:16-alpine
    environment: { POSTGRES_PASSWORD: postgres }
    ports: ["5432:5432"]
    volumes: [dbdata:/var/lib/postgresql/data]
    healthcheck: { test: ["CMD-SHELL","pg_isready -U postgres"], interval: 5s, timeout: 3s, retries: 20 }
  redis:
    image: redis:7-alpine
    ports: ["6379:6379"]
  workspace:
    image: node:20.19
    working_dir: /workspace
    volumes: [".:/workspace"]
    command: sh -c "sleep infinity"
    depends_on: [db, redis]
volumes: { dbdata: {} }
`);

// ---------- MAKEFILE ----------
W("Makefile",`
SHELL:=/bin/bash
.PHONY: up down db.migrate db.seed dev smoke
up: ; docker compose -f infra/docker/compose.dev.yaml up -d --build
down: ; docker compose -f infra/docker/compose.dev.yaml down -v
db.migrate: ; pnpm -C packages/db prisma:migrate && pnpm -C packages/db prisma:generate
db.seed: ; pnpm -C packages/db prisma:seed
dev:
\tcorepack enable
\tpnpm install
\tmake up
\tpnpm -C packages/db prisma:migrate
\tpnpm -C packages/db prisma:seed
\tpnpm -C apps/bff dev & pnpm -C apps/admin dev
smoke: ; node scripts/smoke.mjs
`);

// ---------- DB PACKAGE (Prisma) ----------
W("packages/db/package.json", JSON.stringify({
  name:"@subway/db",
  version:"0.1.0",
  type:"module",
  scripts:{
    "prisma:generate":"prisma generate",
    "prisma:migrate":"prisma migrate deploy || prisma migrate dev --name init",
    "prisma:seed":"node prisma/seed.mjs",
    "typecheck":"tsc -p tsconfig.json"
  },
  dependencies:{ "@prisma/client":"5.18.0" },
  devDependencies:{ prisma:"5.18.0", typescript:"5.5.4" }
}, null, 2));

W("packages/db/tsconfig.json", JSON.stringify({
  compilerOptions:{ target:"ES2022", module:"ES2022", moduleResolution:"Bundler", outDir:"dist", strict:true }
}, null, 2));

W("packages/db/prisma/schema.prisma", `
generator client { provider = "prisma-client-js" }
datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  role      Role     @default(STAFF)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Orders    Order[]
}

model Store {
  id        String   @id @default(cuid())
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  Orders    Order[]
  MenuItems MenuItem[]
}

model MenuItem {
  id        String   @id @default(cuid())
  storeId   String
  name      String
  price     Decimal  @db.Numeric(10,2)
  active    Boolean  @default(true)
  Store     Store    @relation(fields: [storeId], references: [id])
}

model Order {
  id        String   @id @default(cuid())
  storeId   String
  userId    String?
  total     Decimal  @db.Numeric(10,2)
  status    OrderStatus @default(PAID)
  createdAt DateTime @default(now())
  Store     Store    @relation(fields: [storeId], references: [id])
  User      User?    @relation(fields: [userId], references: [id])
}

enum OrderStatus { PAID PENDING CANCELLED }
enum Role { ADMIN MANAGER STAFF }
`);

W("packages/db/prisma/seed.mjs", `
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main(){
  const a = await prisma.store.create({ data:{ name:"Central Station" }});
  const b = await prisma.store.create({ data:{ name:"Riverside" }});
  await prisma.menuItem.createMany({ data:[
    { storeId:a.id, name:"Italian B.M.T.", price:7.27 },
    { storeId:a.id, name:"Veggie Delite", price:5.10 },
    { storeId:b.id, name:"Turkey Breast", price:8.50 }
  ]});
  await prisma.user.create({ data:{ email:"admin@example.com", role:"ADMIN" }});
  await prisma.order.createMany({ data:[
    { storeId:a.id, total:7.27, status:"PAID" },
    { storeId:a.id, total:8.06, status:"PAID" },
    { storeId:b.id, total:9.16, status:"PAID" }
  ]});
}
main().finally(()=>prisma.$disconnect());
`);

// ---------- CONFIG PACKAGE ----------
W("packages/config/package.json", JSON.stringify({
  name:"@subway/config",
  version:"0.1.0",
  type:"module",
  exports:"./src/index.ts",
  devDependencies:{ typescript:"5.5.4" }
}, null, 2));

W("packages/config/src/index.ts",
`export const config = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: parseInt(process.env.PORT ?? "3001", 10),
  databaseUrl: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/subway?schema=public",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
};
`);

// ---------- BFF (NestJS) ----------
W("apps/bff/package.json", JSON.stringify({
  name:"@subway/bff",
  version:"0.1.0",
  private:true,
  scripts:{ dev:"nest start --watch", build:"nest build", start:"node dist/main.js", typecheck:"tsc -p tsconfig.json" },
  dependencies:{
    "@nestjs/common":"10.3.9","@nestjs/core":"10.3.9","@nestjs/platform-express":"10.3.9",
    "@prisma/client":"5.18.0","prisma":"5.18.0","express":"4.19.2","zod":"3.23.8","@subway/config":"workspace:*"
  },
  devDependencies:{ "@nestjs/cli":"10.3.2","typescript":"5.5.4","ts-node":"10.9.2" }
}, null, 2));

W("apps/bff/tsconfig.json", JSON.stringify({
  compilerOptions:{ module:"CommonJS", target:"ES2022", outDir:"dist", rootDir:"src", strict:true, moduleResolution:"Node" }
}, null, 2));

W("apps/bff/src/main.ts", `
import { NestFactory } from '@nestjs/core';
import { AppModule } from './module';
async function bootstrap(){
  const app = await NestFactory.create(AppModule, { cors:true });
  await app.listen(process.env.PORT || 3001);
  console.log("BFF listening on", process.env.PORT || 3001);
}
bootstrap();
`);

W("apps/bff/src/module.ts", `
import { Module } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { HealthController } from './routes/health';
import { KpiController } from './routes/kpis';

@Module({
  controllers: [HealthController, KpiController],
  providers: [{ provide: 'PRISMA', useFactory: () => new PrismaClient() }],
})
export class AppModule {}
`);

W("apps/bff/src/routes/health.ts", `
import { Controller, Get } from '@nestjs/common';
@Controller()
export class HealthController {
  @Get('/healthz') health(){ return { ok:true }; }
}
`);

W("apps/bff/src/routes/kpis.ts", `
import { Controller, Get, Query } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
@Controller()
export class KpiController {
  constructor(private readonly prisma = new PrismaClient()){}
  @Get('/kpis') async kpis(@Query('storeId') storeId?: string){
    const where:any = storeId ? { storeId } : {};
    const [orders, revenue, menuCount, pending] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.aggregate({ _sum: { total: true }, where }),
      this.prisma.menuItem.count({ where }),
      this.prisma.order.count({ where: { ...where, status: 'PENDING' } })
    ]);
    return {
      ordersToday: orders,
      revenueToday: Number(revenue._sum.total ?? 0),
      menuItems: menuCount,
      pendingOrders: pending
    };
  }
}
`);

// ---------- ADMIN (Next 14) ----------
W("apps/admin/package.json", JSON.stringify({
  name:"@subway/admin",
  version:"0.1.0",
  private:true,
  scripts:{ dev:"next dev -p 3002", build:"next build", start:"next start -p 3002", typecheck:"tsc -p tsconfig.json" },
  dependencies:{ next:"14.2.5", react:"18.3.1", "react-dom":"18.3.1", tailwindcss:"3.4.7", zod:"3.23.8", axios:"1.7.2" },
  devDependencies:{ typescript:"5.5.4","@types/node":"20.12.7","@types/react":"18.2.79" }
}, null, 2));

W("apps/admin/next.config.js","module.exports={experimental:{serverActions:true}};\n");
W("apps/admin/tailwind.config.js","module.exports={content:[\"./app/**/*.{ts,tsx}\",\"./components/**/*.{ts,tsx}\"],theme:{extend:{colors:{bg:\"#0f172a\",card:\"#1e293b\"}}},plugins:[],};\n");
W("apps/admin/postcss.config.js","module.exports={plugins:{tailwindcss:{},autoprefixer:{}}};\n");
W("apps/admin/app/globals.css","@tailwind base;@tailwind components;@tailwind utilities;body{background:#0f172a;color:white}.card{background:#1e293b;border-radius:.75rem;padding:1.5rem;box-shadow:0 2px 10px rgba(0,0,0,.3)}\n");
W("apps/admin/tsconfig.json", JSON.stringify({ compilerOptions:{ jsx:"react-jsx", module:"ESNext", target:"ES2022", moduleResolution:"Bundler", strict:true }}, null, 2));
W("apps/admin/app/layout.tsx","export default function RootLayout({children}:{children:React.ReactNode}){return(<html><body>{children}</body></html>)}\n");
W("apps/admin/app/dashboard/page.tsx", `
import axios from "axios";
async function getData(storeId?: string){
  const base = process.env.NEXT_PUBLIC_BFF_URL || "http://localhost:3001";
  const url = \`\${base}/kpis\${storeId ? \`?storeId=\${storeId}\` : ""}\`;
  const { data } = await axios.get(url, { timeout: 5000 });
  return data;
}
export default async function Dashboard(){
  const data = await getData();
  return (<main className="p-6 space-y-6">
    <div className="flex items-center justify-between">
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <span className="text-sm opacity-70">Data source: {process.env.NEXT_PUBLIC_BFF_URL || "http://localhost:3001"}</span>
    </div>
    <div className="grid grid-cols-4 gap-4">
      <div className="card"><p>Today's Orders</p><p className="text-3xl">{data.ordersToday}</p></div>
      <div className="card"><p>Revenue Today</p><p className="text-3xl">£{data.revenueToday.toFixed(2)}</p></div>
      <div className="card"><p>Menu Items</p><p className="text-3xl">{data.menuItems}</p></div>
      <div className="card"><p>Pending Orders</p><p className="text-3xl">{data.pendingOrders}</p></div>
    </div>
  </main>);
}
`);

// ---------- SMOKE (you'll run later) ----------
W("scripts/smoke.mjs", `
import http from "node:http";
const get=u=>new Promise((res,rej)=>{const r=http.get(u,s=>{let d="";s.on("data",c=>d+=c);s.on("end",()=>res({status:s.statusCode,data:d}))});r.on("error",rej);});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{ await wait(1000);
  const h=await get("http://localhost:3001/healthz"); if(h.status!==200) throw new Error("BFF health failed");
  const k=await get("http://localhost:3001/kpis"); if(k.status!==200) throw new Error("BFF kpis failed");
  const a=await get("http://localhost:3002/dashboard"); if(a.status!==200) throw new Error("Admin dashboard failed");
  console.log("SMOKE OK");
})().catch(e=>{console.error(e);process.exit(1);});
`);

console.log("Repo files written.");
