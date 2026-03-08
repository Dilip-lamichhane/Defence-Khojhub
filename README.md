# 🧭 KhojHub - Local Business Discovery Platform

KhojHub helps people find nearby shops and services, and helps shopkeepers list their businesses, products, and hours. It combines a modern web app with geospatial search so customers can explore shops on a map and shopkeepers can manage their catalog. ✨

## 🎯 Project Aim
- Connect local customers with verified businesses nearby.
- Provide a simple way for shopkeepers to register, manage products, and update hours.
- Offer map-based discovery with category filters and quick directions.

## ✅ What You Can Do
### 🧍 For Customers
- Explore nearby businesses on a map.
- Filter by category and search by product.
- View shop details, catalogs, and ratings.

### 🏪 For Shopkeepers
- Register a business.
- Manage products and availability.
- Update shop hours and basic info.

### 🛡️ For Admins
- Review business submissions.
- Monitor platform activity.

## 🧰 Tech Stack (Simple Summary)
- Frontend: React + Vite + Tailwind CSS 🧩
- Backend: Node.js + Express 🛠️
- Auth: Clerk 🔑
- Databases:
  - MongoDB (core app data) 🗄️
  - Supabase/Postgres + PostGIS (geospatial + map data) 🌍

## 🔗 Quick Links (Local)
- Frontend: http://localhost:5173/ 🖥️
- Map: http://localhost:5173/map 🗺️
- Admin: http://localhost:5173/admin 🧑‍⚖️
- API Health: http://localhost:5000/api/v1/health ❤️

## 📥 Download / Clone
1. Install Git from https://git-scm.com
2. Open a terminal and run:
```
git clone <your-repo-url>
cd minor-project1
```

## 🧑‍💻 Setup Guide (Beginner Friendly)
### 1️⃣ Install Requirements
- Node.js (v18+): https://nodejs.org 🟢
- MongoDB (local) or MongoDB Atlas account 🧱
- Supabase account: https://supabase.com 🧭
- Clerk account: https://clerk.com 🔐
- Google Maps API key (optional, only for Google Maps view) 🗺️

### 2️⃣ Install Dependencies
```
# Root utilities
npm install

# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3️⃣ Create Environment Files
Copy the example files and fill in your credentials.
```
copy backend\.env.example backend\.env
copy frontend\.env.example frontend\.env
```
Fill in the values in the new .env files. See keys.txt for a full list of required variables.

### 4️⃣ Supabase Schema
Open your Supabase SQL editor and run:
```
supabase/schema-fix.sql
```
Run it in both REAL and DUMMY projects if you use both.

### 5️⃣ Start the App
```
# Backend
cd backend
npm run dev

# Frontend
cd ../frontend
npm run dev
```

## 🧭 How to Use (Non‑Developer Friendly)
1. Open http://localhost:5173
2. Sign in with Clerk.
3. Explore the map or register a business.
4. If you are a shopkeeper, open the shop dashboard to manage products.

## ⚙️ Configuration Notes
- Project switching:
  - Backend: ACTIVE_SUPABASE_PROJECT=REAL or DUMMY
  - Frontend: VITE_ACTIVE_SUPABASE_PROJECT=REAL or DUMMY
- If Google Maps is not needed, you can leave VITE_GOOGLE_MAPS_API_KEY empty.

## 🧯 Troubleshooting
- Map empty: verify Supabase schema and RLS policies, then reload. 🧭
- Auth issues: confirm Clerk keys and JWT template named "supabase" (HS256, signed with Supabase JWT secret). 🔑
- “Category column” errors: run supabase/schema-fix.sql again. 🧩

## 🔐 Security Notes
Never commit real secrets. Use .env files locally and keep them out of git.

## 🤝 Contributing
See update.txt for developer notes and contribution guidelines.
- **Action Buttons**: CRUD operation buttons
- **Status Indicators**: Online/offline badges

## 📱 Mobile Responsiveness

### Breakpoint Strategy
- **Mobile**: 320px - 768px (Single column layout)
- **Tablet**: 768px - 1024px (Two column layout)
- **Desktop**: 1024px+ (Multi-column layout)

### Touch Optimizations
- **Touch-Friendly Buttons**: Minimum 44px touch targets
- **Swipe Gestures**: Support for swipe navigation
- **Optimized Images**: Responsive images with proper sizing
- **Performance**: Fast loading on mobile networks

## 🔒 Security Features

### Authentication Security
- **JWT Token Expiry**: Configurable token expiration
- **Password Requirements**: Strong password validation
- **Rate Limiting**: API request rate limiting
- **CORS Configuration**: Proper cross-origin setup

### Data Protection
- **Environment Variables**: Sensitive data in .env files
- **Input Sanitization**: XSS and SQL injection prevention
- **Error Messages**: Non-sensitive error responses
- **HTTPS Ready**: SSL/TLS configuration support

## 📈 Performance Optimization

### Frontend Performance
- **Code Splitting**: Lazy loading for routes and components
- **Image Optimization**: Responsive images with proper formats
- **Bundle Size**: Tree shaking and dead code elimination
- **Caching**: Browser caching strategies

### Backend Performance
- **Database Indexing**: Optimized queries with proper indexes
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Optimized MongoDB aggregation pipelines
- **Response Compression**: Gzip compression for API responses

## 🧪 Testing Strategy

### Unit Testing
- **Component Testing**: React component unit tests
- **API Testing**: Backend endpoint testing
- **Database Testing**: Database query testing
- **Integration Testing**: Full workflow testing

### Manual Testing
- **Cross-Browser**: Chrome, Firefox, Safari, Edge
- **Mobile Testing**: iOS and Android devices
- **Performance Testing**: Load testing and stress testing
- **Security Testing**: Vulnerability assessment

## 🚀 Deployment Options

### Development
- **Local Development**: Full stack on localhost
- **Database**: Local MongoDB and Supabase
- **Hot Reload**: Instant code changes

### Production Deployment
- **Frontend**: Vercel, Netlify, or AWS S3
- **Backend**: Heroku, AWS EC2, or DigitalOcean
- **Database**: MongoDB Atlas or AWS DocumentDB
- **CDN**: CloudFlare or AWS CloudFront

## 📚 Documentation

### Available Documentation
- **[updates.md](updates.md)**: Complete project development log
- **[techstack.md](techstack.md)**: Detailed technology stack
- **[instructions.md](instructions.md)**: Development setup guide
- **[MONGODB_COMPASS_SETUP.md](MONGODB_COMPASS_SETUP.md)**: Database setup

### Code Documentation
- **Inline Comments**: Detailed code comments
- **API Documentation**: Swagger/OpenAPI ready
- **Component Stories**: Storybook integration ready
- **Architecture Diagrams**: System architecture documentation

## 🤝 Contributing

### Development Guidelines
1. Follow the existing code style and patterns
2. Write meaningful commit messages
3. Test your changes thoroughly
4. Update documentation as needed
5. Submit pull requests for review

### Code Style
- **ESLint**: Follow the configured ESLint rules
- **Prettier**: Use Prettier for code formatting
- **Naming Conventions**: Follow React and JavaScript conventions
- **Component Structure**: Use functional components with hooks

## 📞 Support & Contact

### Project Maintainer
- **GitHub**: [Dilip-lamichhane](https://github.com/Dilip-lamichhane)
- **Repository**: [DEFENCE](https://github.com/Dilip-lamichhane/DEFENCE)

### Issues & Bug Reports
- Use GitHub Issues for bug reports
- Provide detailed reproduction steps
- Include environment information
- Attach screenshots if applicable

---

**🎯 KhojHub** - Connecting local businesses with customers through intelligent location-based discovery.

*Built with ❤️ using React, Node.js, MongoDB, and Supabase*
