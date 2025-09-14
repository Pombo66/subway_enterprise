
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
