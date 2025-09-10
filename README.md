# TransitNet Optimizer

Advanced public transport route optimization system for intelligent urban mobility planning

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-v18+-green.svg)
![Express](https://img.shields.io/badge/express-v4.18+-red.svg)
![MongoDB](https://img.shields.io/badge/mongodb-v6.0+-green.svg)

## 🚀 Overview

TransitNet Optimizer is a comprehensive web-based platform that revolutionizes public transport planning through data-driven insights and advanced algorithmic optimization. Designed for transit authorities, urban planners, and transportation engineers, this intelligent system provides powerful tools for route analysis, network optimization, and comprehensive service planning.

The platform integrates cutting-edge algorithms with intuitive visualization tools to transform complex transportation data into actionable insights. By leveraging Dijkstra-based optimization techniques and interactive mapping capabilities, TransitNet Optimizer enables users to design efficient route networks that maximize coverage while minimizing operational costs and travel times for passengers.

## ✨ Key Features

### 🔧 Technical Capabilities
- **Advanced Algorithms**: Dijkstra-based route optimization with customizable parameters and multi-objective optimization capabilities
- **Interactive Mapping**: Leaflet-based visualization with drag-and-drop route creation and real-time editing capabilities
- **Real-time Analysis**: Live performance metrics, side-by-side comparisons, and instant feedback on route modifications
- **Data Export**: Comprehensive export options including CSV, JSON, and formatted reports for implementation
- **Responsive Design**: Fully responsive interface optimized for desktop, tablet, and mobile devices
- **Region Management**: Multi-region data organization with version control and collaborative workspace features

### 📊 Data Support
- **Transport Route Files**: CSV files containing comprehensive route information including stops, schedules, route IDs, and operational parameters
- **Mobility Area Files**: CSV files with precise geographic coordinates, area definitions, demographic data, and connectivity information
- **Mobility Matrix Files**: CSV files representing detailed travel patterns, demand matrices, and passenger flow data between different areas and time periods

## 🏗️ System Architecture

### Technology Stack
- **Backend**: Node.js with Express.js framework
- **Database**: MongoDB for data storage and management
- **Frontend**: EJS templating with Bootstrap 5 for responsive UI
- **Mapping**: Leaflet.js for interactive map visualization
- **Charts**: Chart.js for data visualization and analytics
- **File Processing**: Multer for file uploads and CSV parsing

### Project Structure
```
TransitNet-Optimizer/
├── public/
│   ├── css/           # Stylesheets for different modules
│   ├── js/            # Client-side JavaScript
│   └── images/        # Static assets
├── views/
│   ├── layouts/       # EJS layout templates
│   ├── pages/         # Individual page templates
│   └── partials/      # Reusable UI components
├── routes/            # Express route handlers
├── models/            # MongoDB data models
├── controllers/       # Business logic controllers
├── middleware/        # Custom middleware functions
└── uploads/           # File upload directory
```

## 🚦 System Workflow

TransitNet Optimizer follows a systematic 5-step workflow designed to guide users through the complete process of transportation network optimization:

### 1. 📤 Data Upload Center
**Purpose**: Import and organize your transportation data files by region for comprehensive analysis.

**Workflow**: Start by selecting or creating a region, then upload your transport route files (CSV), mobility area coordinates, and travel pattern matrices. The system automatically validates file formats and organizes data for seamless integration with other modules. Files are versioned and can be updated incrementally as your data evolves.

### 2. 👁️ Data Visualization
**Purpose**: Explore and understand your transportation network through interactive maps and visual analytics.

**Workflow**: Select your region and data files to generate dynamic visualizations of your transport network. View existing routes overlaid on maps, examine mobility area distributions, and analyze travel patterns through heat maps and connection matrices. This visual exploration helps identify network gaps and optimization opportunities.

### 3. ➕ Route Creation (Optional)
**Purpose**: Design new transportation routes manually using interactive mapping tools and drag-and-drop interfaces.

**Workflow**: Access the route creation interface to manually design custom routes by clicking points on the map or dragging stops into desired sequences. Define route characteristics, set scheduling parameters, and preview route efficiency metrics in real-time. Save created routes to your regional dataset for inclusion in optimization processes.

### 4. ⚙️ Route Optimization
**Purpose**: Apply advanced algorithms to automatically optimize your entire transportation network for maximum efficiency.

**Workflow**: Configure optimization parameters including objectives (minimize distance, maximize coverage, reduce travel time), constraints (budget limits, fleet size), and performance weights. Run Dijkstra-based optimization algorithms that analyze all possible route combinations and generate optimal network configurations. Review detailed performance metrics, comparison charts, and export comprehensive optimization reports.

### 5. 📊 Interactive Service Planning
**Purpose**: Fine-tune optimized routes through interactive modification and generate final implementation-ready service plans.

**Workflow**: Load optimization results and interactively modify routes on the map by adding, editing, or removing segments. Compare your modifications against baseline optimization results in real-time through side-by-side performance metrics. Export finalized route data, implementation schedules, and comprehensive service plans ready for transit authority approval and deployment.

## 🛠️ Installation

### Prerequisites
- Node.js (v18 or higher)
- MongoDB (v6.0 or higher)
- Git

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/TransitNet-Optimizer.git
   cd TransitNet-Optimizer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   Create a `.env` file in the root directory:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/transitnet
   SESSION_SECRET=your_session_secret_here
   NODE_ENV=development
   ```

4. **Start MongoDB service**
   ```bash
   # On Windows
   net start MongoDB
   
   # On macOS/Linux
   sudo systemctl start mongod
   ```

5. **Run the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

6. **Access the application**
   Open your browser and navigate to `http://localhost:3000`

## 📖 Usage Guide

### Getting Started
1. **Upload Data**: Begin by selecting a region and uploading your transportation data files
2. **Visualize Network**: Explore your data through interactive maps and analytics
3. **Create Routes** (Optional): Design custom routes using the interactive tools
4. **Optimize**: Run optimization algorithms to find optimal route configurations
5. **Plan Services**: Fine-tune results and export implementation-ready plans

### Data Format Requirements

#### Transport Route Files (CSV)
```csv
route_id,stop_name,stop_sequence,latitude,longitude
R001,Central Station,1,33.6844,73.0479
R001,University Stop,2,33.6992,73.0363
```

#### Mobility Area Files (CSV)
```csv
area_name,latitude,longitude,population,area_type
Downtown,33.6844,73.0479,50000,commercial
University,33.6992,73.0363,25000,educational
```

#### Mobility Matrix Files (CSV)
```csv
from_area,to_area,demand,travel_time,distance
Downtown,University,500,25,12.5
University,Downtown,450,30,12.5
```

## 👥 Development Team

- **Muhammad Bilal** - *Lead Developer* - System Architecture, Frontend & Backend Development, User Interface Design
- **Javeria** - *Algorithm Developer* - Route Optimization Algorithms, Mathematical Modeling, Performance Analysis
- **Dr. Rabeeh Abbasi** - *Project Supervisor* - Academic Supervision & Research Guidance
- **Irfan ul Haq Qureshi** - *Technical Advisor* - Technical Consultation & System Architecture

## 🏛️ Institutional Support

- **Department of Computer Science**
- **Quaid-i-Azam University Islamabad**
- **Road Safety Project** (Project ID: GCF-744)

## 🤝 Contributing

We welcome contributions from the transportation planning community! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

We extend our gratitude to all contributors, testers, and the transportation planning community for their valuable feedback and support in developing this comprehensive optimization platform.

## 🐛 Issues & Support

If you encounter any issues or need support, please:
1. Check the [existing issues](https://github.com/yourusername/TransitNet-Optimizer/issues)
2. Create a new issue with detailed information
3. Contact the development team

## 🔄 Version History

- **v1.0.0** - Initial release with core optimization features
- **v1.1.0** - Added interactive service planning module
- **v1.2.0** - Enhanced UI with light theme and improved workflows

---

**TransitNet Optimizer** - Transforming urban mobility through intelligent route optimization.
