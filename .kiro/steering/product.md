# Product Overview

Subway Enterprise Baseline is a multi-tenant restaurant management system designed for enterprise-scale operations. The system provides:

- **Admin Dashboard**: Web-based interface for managing stores, orders, and users across multiple regions (EMEA, AMER, APAC)
- **Backend API (BFF)**: NestJS-based backend-for-frontend service providing data access and business logic
- **Multi-region Support**: Store management with country and region-based organization
- **Order Management**: Complete order lifecycle from creation to fulfillment with status tracking
- **User Management**: Role-based access control (Admin, Manager, Staff)
- **Menu Management**: Store-specific menu items with pricing and availability controls
- **AI-Powered Features**:
  - **SubMind Assistant**: Context-aware AI assistant using GPT-5-mini for operational insights and expansion analysis
  - **Expansion Intelligence**: AI-driven location discovery and market analysis using GPT-5.2 and GPT-5-mini models
  - **Strategic Recommendations**: Automated site scoring and viability assessment

## Deployment Status

**🚀 PRODUCTION DEPLOYMENT - LIVE ON RAILWAY**

This system is currently deployed and running in production:
- **Admin Dashboard**: Deployed on Railway
- **BFF API**: Deployed on Railway at `https://subwaybff-production.up.railway.app`
- **Database**: PostgreSQL hosted on Railway
- **Status**: Active production system with live data

**Important Notes:**
- Changes to code are automatically deployed to Railway via CI/CD
- Environment variables are managed in Railway dashboard
- This is NOT a development-only system - treat all changes as production changes
- Database migrations affect live production data

The system is built for scalability and supports enterprise deployment patterns with Docker containerization and database migrations.