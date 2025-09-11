# TransitNet Optimizer - User Manual

## 📚 Complete Guide to Using TransitNet Optimizer

*Version 1.2.0 | Last Updated: December 2024*

---

## 📋 Table of Contents

1. [Getting Started](#getting-started)
2. [System Overview](#system-overview)
3. [Authentication & Access](#authentication--access)
4. [Module 1: Data Upload Center](#module-1-data-upload-center)
5. [Module 2: Data Visualization](#module-2-data-visualization)
6. [Module 3: Route Creation](#module-3-route-creation)
7. [Module 4: Route Optimization](#module-4-route-optimization)
8. [Module 5: Interactive Service Planning](#module-5-interactive-service-planning)
9. [Data Formats & Requirements](#data-formats--requirements)
10. [Troubleshooting](#troubleshooting)
11. [FAQ](#frequently-asked-questions)
12. [Support & Contact](#support--contact)

---

## Getting Started

### System Requirements
- **Web Browser**: Modern browser (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+)
- **Internet Connection**: Stable broadband connection recommended
- **Screen Resolution**: Minimum 1024x768, recommended 1366x768 or higher
- **JavaScript**: Must be enabled

### Accessing the System
1. **Navigate** to the TransitNet Optimizer URL provided by your administrator
2. **Bookmark** the page for easy future access
3. **Ensure** you have valid user credentials (contact system administrator if needed)

---

## System Overview

### What is TransitNet Optimizer?
TransitNet Optimizer is a comprehensive web-based platform for public transport planning that combines:
- **Data Management**: Region-based file organization and validation
- **Visual Analytics**: Interactive maps and network visualization
- **Route Design**: Manual route creation tools
- **AI Optimization**: Dijkstra-based algorithmic optimization
- **Service Planning**: Interactive modification and export capabilities

### Workflow Overview
The system follows a **5-step sequential workflow**:

```
Data Upload → Visualization → Route Creation → Optimization → Service Planning
    ↓              ↓             ↓              ↓             ↓
  Import        Explore       Design         Optimize      Finalize
   Data         Network      Routes        Algorithms     Service
```

---

## Authentication & Access

### Logging In

**Step 1: Access Login Page**
- Open your web browser and navigate to the TransitNet Optimizer login page
- You'll see a professional interface with institutional logos at the bottom


**Step 2: Enter Credentials**
1. **Email Address**: Enter your registered email (e.g., `engineer@organization.gov`)
2. **Password**: Enter your secure password (minimum 7 characters)
3. **Click** the blue "Sign In" button

**Step 3: Access Granted**
- Upon successful authentication, you'll be redirected to the Data Upload Center
- Your session will remain active for security timeout period

### User Account Creation (Admin Only)

**Important**: User registration is restricted to system administrators only.


**For Administrators Creating Users:**
1. **Navigate** to the signup page
2. **Fill User Details**:
   - Full Name
   - Email Address
   - Secure Password (7+ characters)
   - User Type: `PolicyMaker` or `Engineer`
   - Organization (optional)

3. **Admin Authorization** (Required):
   - Admin Username: `admin`
   - Admin Password: `admin@devmbilal`

4. **Click** "Sign Up" to create the account

### Logging Out
- **Click** your profile icon in the top-right corner
- **Select** "Logout" from the dropdown menu
- You'll be securely logged out and redirected to the login page

---

## Module 1: Data Upload Center

### Purpose
Import and organize transportation data files by region for comprehensive network analysis.


### Step-by-Step Process

#### Step 1: Region Selection
1. **Locate** the "Select Region" card in the left panel
2. **Click** the dropdown menu
3. **Choose** an existing region OR create a new one by typing a new name
4. **The page will refresh** to show region-specific content

#### Step 2: Understanding File Requirements

The system accepts three types of CSV files:

**🚌 Transport Route Files**
- Contains route information, stops, and scheduling data
- **Required columns**: `route_id`, `stop_name`, `stop_sequence`, `latitude`, `longitude`
- **Purpose**: Defines existing transportation routes

**🗺️ Mobility Area Files**
- Contains geographic coordinates and area definitions
- **Required columns**: `area_name`, `latitude`, `longitude`, `population`, `area_type`
- **Purpose**: Maps service areas and demographics

**📊 Mobility Matrix Files**
- Contains travel patterns and demand data
- **Required columns**: `from_area`, `to_area`, `demand`, `travel_time`, `distance`
- **Purpose**: Represents passenger flow and travel demand

#### Step 3: Upload Process

**For New Regions:**
1. **Select files** using the file input buttons
2. **Transport files are required** (marked with red asterisk)
3. **Mobility area and matrix files are optional** but recommended
4. **Click** "Create Region" to upload and process files


**For Existing Regions:**
1. **View existing files** in the main panel
2. **Use "Upload Additional Files"** card in the left panel to add more files
3. **Delete unwanted files** using the trash icon next to each file


#### Step 4: File Validation
- **System automatically validates** file formats and required columns
- **Error messages** will appear if files don't meet requirements
- **Success message** confirms successful upload and processing

### Tips for Success
- **Prepare files in CSV format** before starting
- **Use consistent naming conventions** for areas and routes
- **Ensure coordinate data is accurate** (latitude/longitude in decimal degrees)
- **Check file encoding** (UTF-8 recommended)

---

## Module 2: Data Visualization

### Purpose
Explore and understand your transportation network through interactive maps and visual analytics.


### Getting Started

#### Step 1: Navigation
1. **Click** "Data Visualization" in the sidebar menu
2. **Select your region** from the dropdown if not already selected
3. **Choose data files** to visualize from the available options

#### Step 2: Map Interface Overview

**Map Controls:**
- **Zoom In/Out**: Use mouse wheel or +/- buttons
- **Pan**: Click and drag to move around the map
- **Reset View**: Click home button to return to default view
- **Layer Toggle**: Show/hide different data layers


### Visualization Features

#### Route Network Visualization
1. **Route Overlay**: Existing routes displayed as colored lines
2. **Stop Points**: Individual stops shown as markers
3. **Route Information**: Click any route to see details


#### Mobility Areas
1. **Area Boundaries**: Service areas shown as colored polygons
2. **Population Density**: Color coding based on population data
3. **Area Details**: Click areas for demographic information


#### Travel Patterns
1. **Flow Lines**: Visual representation of passenger movement
2. **Heat Maps**: Demand intensity visualization
3. **Connection Matrix**: Interactive demand table


### Analysis Tools

#### Interactive Features
- **Click** any element for detailed information
- **Hover** over routes/areas for quick previews
- **Use filters** to show specific data subsets
- **Toggle layers** to focus on particular aspects

#### Export Options
1. **Screenshot**: Save current map view as image
2. **Data Export**: Download filtered datasets
3. **Report Generation**: Create analysis summaries

### Best Practices
- **Start with overview** - Load all data to see the complete network
- **Use layer controls** - Toggle layers on/off to avoid visual clutter
- **Zoom for detail** - Examine specific areas at higher zoom levels
- **Take notes** - Document insights for later optimization decisions

---

## Module 3: Route Creation

### Purpose
Design new transportation routes manually using interactive mapping tools and drag-and-drop interfaces.


### Getting Started

#### Step 1: Access Route Creation
1. **Navigate** to "Route Creation" in the sidebar
2. **Select your region** if not already selected
3. **The map will load** with existing network data for reference

#### Step 2: Interface Overview

**Left Panel - Route Management:**
- **Route List**: Shows all created routes
- **Route Details**: Properties of selected route
- **Save/Delete Controls**: Route management buttons

**Center Panel - Interactive Map:**
- **Drawing Tools**: Click-to-add route points
- **Existing Network**: Reference overlay (can be toggled)
- **New Route Preview**: Real-time route visualization

**Right Panel - Route Properties:**
- **Route Information**: Name, ID, description
- **Performance Metrics**: Distance, estimated time
- **Schedule Settings**: Frequency, operating hours


### Creating a New Route

#### Step 1: Start Route Creation
1. **Click** "New Route" button in the left panel
2. **Enter route name** and description
3. **Select route type** (Bus, BRT, etc.)
4. **Choose color** for route visualization

#### Step 2: Design Route Path

**Method 1: Click-to-Add Points**
1. **Click** on the map where you want the first stop
2. **Continue clicking** to add subsequent stops
3. **Double-click** to finish the route
4. **System automatically** calculates path between points


**Method 2: Drag-and-Drop Stops**
1. **Drag existing stops** from the stop library to the map
2. **Connect stops** by drawing lines between them
3. **Reorder stops** by dragging in the route list
4. **System updates** route path automatically


#### Step 3: Configure Route Properties

**Basic Information:**
- **Route Name**: Descriptive identifier
- **Route ID**: System-generated or custom
- **Description**: Purpose and service area
- **Route Type**: Service classification

**Operational Parameters:**
- **Service Frequency**: Trips per hour/day
- **Operating Hours**: Start and end times
- **Vehicle Capacity**: Passengers per vehicle
- **Travel Speed**: Average speed between stops


#### Step 4: Validate and Save

**Validation Checks:**
- **Route Length**: Reasonable distance validation
- **Stop Spacing**: Adequate spacing between stops
- **Connectivity**: Proper network connections
- **Feasibility**: Basic operational feasibility

**Save Process:**
1. **Review** route details and metrics
2. **Make adjustments** if validation warnings appear
3. **Click** "Save Route" to add to regional dataset
4. **Confirmation** message indicates successful save


### Tips for Effective Route Design

**Planning Considerations:**
- **Study demand patterns** from visualization module first
- **Consider existing infrastructure** and road networks
- **Plan for accessibility** at all stops
- **Balance coverage vs. efficiency** in route design

**Technical Best Practices:**
- **Keep reasonable stop spacing** (300-800 meters typical)
- **Avoid sharp turns** and difficult maneuvers
- **Consider travel time** vs. direct distance
- **Plan for peak and off-peak** service variations

---

## Module 4: Route Optimization

### Purpose
Apply advanced algorithms to automatically optimize your entire transportation network for maximum efficiency.


### Understanding Optimization

#### What Gets Optimized?
- **Route Paths**: Most efficient connections between areas
- **Stop Locations**: Optimal placement for maximum coverage
- **Service Frequency**: Balanced resource allocation
- **Network Connectivity**: Seamless passenger transfers

#### Optimization Algorithms
TransitNet Optimizer uses **Dijkstra-based algorithms** that consider:
- **Distance Minimization**: Shortest path calculations
- **Coverage Maximization**: Service area optimization
- **Demand Satisfaction**: Passenger need fulfillment
- **Cost Efficiency**: Resource utilization optimization

### Step-by-Step Optimization Process

#### Step 1: Access Optimization Module
1. **Navigate** to "Route Optimization" in the sidebar
2. **Select your region** with uploaded data
3. **Ensure** you have mobility matrix data for best results


#### Step 2: Configure Optimization Parameters

**Optimization Objectives (Weight Distribution):**
- **Distance Efficiency** (0-100%): Minimize total network distance
- **Coverage Maximization** (0-100%): Maximize area coverage
- **Demand Response** (0-100%): Prioritize high-demand areas
- **Transfer Optimization** (0-100%): Minimize passenger transfers


**Constraints Configuration:**
- **Maximum Routes**: Limit total number of routes
- **Budget Limit**: Financial constraints (if applicable)
- **Fleet Size**: Available vehicle limitations
- **Service Standards**: Minimum service frequency/coverage


#### Step 3: Run Optimization

1. **Review** all parameter settings
2. **Click** "Start Optimization" button
3. **Monitor progress** via progress bar and status updates
4. **Wait for completion** (may take several minutes for large networks)


#### Step 4: Review Results

**Results Overview Dashboard:**
- **Performance Metrics**: Key improvement statistics
- **Network Comparison**: Before vs. after analysis
- **Route Details**: Specific route recommendations
- **Implementation Priority**: Suggested rollout sequence


### Export and Documentation

#### Export Options
1. **Optimization Report**: Comprehensive PDF report
2. **Route Data**: CSV files with route details
3. **Network Maps**: High-resolution map images
4. **Implementation Guide**: Step-by-step deployment plan


---

## Module 5: Interactive Service Planning

### Purpose
Fine-tune optimized routes through interactive modification and generate final implementation-ready service plans.


### Getting Started

#### Step 1: Load Optimization Results
1. **Navigate** to "Interactive Service Planning"
2. **Select your region** from the dropdown
3. **Choose optimization session** from available results
4. **Click "Load Results"** to import baseline optimization


#### Step 2: Interface Overview

**Left Panel - Baseline Summary:**
- **Optimization Metrics**: Key performance indicators
- **Route List**: Top recommended routes
- **Baseline Performance**: Reference measurements

**Center Panel - Interactive Map:**
- **Baseline Routes**: Optimization recommendations (blue)
- **User Routes**: Your modifications (green)
- **Editing Tools**: Add, edit, delete route controls
- **Real-time Preview**: Live route visualization

**Right Panel - Comparison Analysis:**
- **Performance Comparison**: Baseline vs. modified metrics
- **Impact Assessment**: Changes in key indicators
- **Export Controls**: Save final service plan


### Interactive Route Modification

#### Adding New Routes

**Step 1: Activate Add Mode**
1. **Click** the green "+" button in map controls
2. **Cursor changes** to crosshair for route creation
3. **Status indicator** shows "Add Route Mode Active"

**Step 2: Create Route**
1. **Click** on map to place first stop
2. **Continue clicking** to add route points
3. **Double-click** to finish route creation
4. **Route appears** in green as user modification


#### Editing Existing Routes

**Step 1: Select Route for Editing**
1. **Click** on any route (baseline or user-created)
2. **Route highlights** and selection tools appear
3. **Edit options** become available in toolbar

**Step 2: Modification Options**

**Move Stops:**
- **Click and drag** individual stops to new positions
- **Route path updates** automatically
- **Performance metrics recalculate** in real-time

**Add Stops:**
- **Click** "Add Stop" then click on map
- **Stop inserts** at optimal position in route
- **Numbering updates** automatically

**Remove Stops:**
- **Click** on stop then press "Delete" or use context menu
- **Route reconnects** automatically
- **Timing and distance** update immediately


### Export and Implementation

#### Export Options

**Service Plan Export:**
1. **Click** "Export Service Plan" button
2. **Choose export format**: PDF, Excel, or CSV
3. **Select content**: Routes only, full analysis, or summary
4. **Download** generates automatically


---

## Data Formats & Requirements

### File Format Specifications

#### Transport Route Files (CSV)

**Required Structure:**
```csv
route_id,stop_name,stop_sequence,latitude,longitude
R001,Central Station,1,33.6844,73.0479
R001,University Stop,2,33.6992,73.0363
R001,Shopping Mall,3,33.7008,73.0551
R002,Bus Terminal,1,33.6851,73.0432
R002,Hospital,2,33.6975,73.0298
```

**Column Definitions:**
- `route_id`: Unique identifier for each route (string)
- `stop_name`: Name of the bus stop or station (string)
- `stop_sequence`: Order of stops along the route (integer, starting from 1)
- `latitude`: Decimal degrees latitude coordinate (decimal, 6+ places)
- `longitude`: Decimal degrees longitude coordinate (decimal, 6+ places)

#### Mobility Area Files (CSV)

**Required Structure:**
```csv
area_name,latitude,longitude,population,area_type
Downtown,33.6844,73.0479,50000,commercial
University District,33.6992,73.0363,25000,educational
Residential North,33.7156,73.0445,35000,residential
Industrial Zone,33.6723,73.0612,8000,industrial
```

**Area Type Options:**
- `residential`: Housing areas
- `commercial`: Business and shopping districts
- `educational`: Schools, universities
- `industrial`: Manufacturing, warehouses
- `recreational`: Parks, entertainment venues
- `medical`: Hospitals, clinics
- `transport`: Terminals, airports
- `mixed`: Mixed-use developments

#### Mobility Matrix Files (CSV)

**Required Structure:**
```csv
from_area,to_area,demand,travel_time,distance
Downtown,University District,500,25,12.5
University District,Downtown,450,30,12.5
Downtown,Residential North,300,20,8.2
Residential North,Downtown,280,22,8.2
Industrial Zone,Downtown,150,35,15.8
```

**Data Requirements:**
- **Symmetric entries**: Include both directions (A→B and B→A)
- **Complete matrix**: All area pairs should be included
- **Realistic values**: Travel times and distances should be feasible
- **Demand patterns**: Should reflect actual or surveyed travel behavior

---

## Troubleshooting

### Common Issues and Solutions

#### Authentication Problems

**Issue: Cannot log in with correct credentials**

*Symptoms:*
- "Invalid email or user not found" error
- "Incorrect password" error
- Page redirects back to login

*Solutions:*
1. **Verify credentials**: Double-check email and password
2. **Check caps lock**: Ensure proper case for password
3. **Clear browser cache**: Delete cookies and cached data
4. **Try different browser**: Test with Chrome, Firefox, or Edge
5. **Contact administrator**: Verify account is active

**Issue: User creation fails (Admin only)**

*Symptoms:*
- "Invalid admin credentials" error
- Form validation errors
- Registration fails after submission

*Solutions:*
1. **Verify admin credentials**: Check ADMIN_USERNAME and ADMIN_PASSWORD
2. **Check environment variables**: Ensure .env file is properly configured
3. **Validate user data**: Ensure all required fields are filled
4. **Check email uniqueness**: Email may already be registered
5. **Review password requirements**: Minimum 7 characters required

#### File Upload Issues

**Issue: File upload fails or validation errors**

*Symptoms:*
- "Invalid file format" error
- "Missing required columns" error
- "Upload failed" message
- File appears corrupted after upload

*Solutions:*
1. **Check file format**: Must be CSV format
2. **Verify column headers**: Must match exactly (case-sensitive)
3. **Check file encoding**: Use UTF-8 encoding
4. **Remove special characters**: Avoid accents, symbols in headers
5. **Check file size**: Large files may timeout
6. **Validate coordinates**: Ensure lat/long are in decimal degrees

---

## Frequently Asked Questions

### General System Questions

**Q: What web browsers are supported?**
A: TransitNet Optimizer works best with modern browsers:
- **Chrome 90+** (Recommended)
- **Firefox 88+** (Recommended)
- **Safari 14+**
- **Edge 90+**
- Internet Explorer is not supported

**Q: Can I use the system on mobile devices?**
A: The system is optimized for desktop use due to complex mapping and data visualization features. While it may work on tablets, mobile phones are not recommended for full functionality.

**Q: How much data can the system handle?**
A: The system can handle:
- **Routes**: Up to 500 routes per region
- **Areas**: Up to 1000 mobility areas per region
- **File Size**: Up to 50MB per upload
- **Regions**: Unlimited regions per user account

**Q: Is my data secure?**
A: Yes, the system implements:
- **Encrypted connections** (HTTPS)
- **Session-based authentication**
- **Regional data isolation**
- **Regular security updates**
- **Admin-controlled user access**

### Data and File Questions

**Q: What coordinate system should I use?**
A: Use **WGS84** coordinate system with coordinates in **decimal degrees**. For example:
- Latitude: 33.6844 (not 33°41'04"N)
- Longitude: 73.0479 (not 73°02'52"E)

**Q: Can I update data after uploading?**
A: Yes, you can:
- **Add new files** to existing regions
- **Delete outdated files** using the trash icon
- **Upload replacement files** with the same structure
- **All modules automatically use** the latest data

**Q: What if I don't have mobility matrix data?**
A: Mobility matrix data is **optional but recommended**. Without it:
- **Visualization works** with route and area data
- **Route creation works** normally
- **Optimization** uses simplified distance-based algorithms
- **Results may be less accurate** for demand-responsive planning

---

## Support & Contact

### Getting Help

#### Self-Service Resources

**Documentation:**
- **User Manual**: This comprehensive guide (always current)
- **Quick Start Guide**: Essential steps for new users
- **Video Library**: Step-by-step tutorial videos
- **Best Practices**: Field-tested recommendations

**Online Resources:**
- **Knowledge Base**: Searchable articles and solutions
- **FAQ Database**: Hundreds of answered questions
- **Community Forum**: User discussions and tips
- **Case Studies**: Real-world implementation examples

#### Direct Support

**Technical Support Team:**
- **Email**: support@transitnet-optimizer.org
- **Response Time**: 24-48 hours for standard issues
- **Priority Support**: Available for critical issues
- **Languages**: English, with additional languages planned

### System Information

#### Development Team

**Lead Developer:**
- **Muhammad Bilal**
- System Architecture, Frontend & Backend Development
- Department of Computer Science, QAU Islamabad

**Algorithm Developer:**
- **Javeria**
- Route Optimization Algorithms, Mathematical Modeling
- Performance Analysis and Validation

**Project Supervision:**
- **Dr. Rabeeh Abbasi** - Project Supervisor
- **Irfan ul Haq Qureshi** - Technical Advisor

#### Institutional Support

**Academic Institution:**
- **Department of Computer Science**
- **Quaid-i-Azam University Islamabad**
- Research and Development Support

**Funding and Partnerships:**
- **Road Safety Project** (Project ID: GCF-744)
- **Capital Development Authority (CDA)**
- Government and Industry Collaboration

---

## Appendices

### Appendix A: Data Format Templates

#### Transport Route Template
```csv
route_id,stop_name,stop_sequence,latitude,longitude
"R001","Central Station",1,33.6844,73.0479
"R001","University Stop",2,33.6992,73.0363
"R001","Shopping Mall",3,33.7008,73.0551
"R001","Hospital",4,33.6975,73.0298
"R001","Bus Terminal",5,33.6851,73.0432
```

#### Mobility Area Template
```csv
area_name,latitude,longitude,population,area_type
"Downtown",33.6844,73.0479,50000,"commercial"
"University District",33.6992,73.0363,25000,"educational"
"Residential North",33.7156,73.0445,35000,"residential"
"Industrial Zone",33.6723,73.0612,8000,"industrial"
"Medical Center",33.6975,73.0298,12000,"medical"
```

#### Mobility Matrix Template
```csv
from_area,to_area,demand,travel_time,distance
"Downtown","University District",500,25,12.5
"University District","Downtown",450,30,12.5
"Downtown","Residential North",300,20,8.2
"Residential North","Downtown",280,22,8.2
"Industrial Zone","Downtown",150,35,15.8
"Downtown","Industrial Zone",120,40,15.8
```

### Appendix B: Common Error Messages

#### File Upload Errors
- **"Invalid file format"**: Use CSV format only
- **"Missing required columns"**: Check column headers exactly
- **"Invalid coordinates"**: Ensure lat/long are decimal degrees
- **"File too large"**: Reduce file size below 50MB
- **"Upload timeout"**: Check internet connection

#### Authentication Errors
- **"Invalid email or user not found"**: Check email address
- **"Incorrect password"**: Verify password case-sensitivity
- **"Account not active"**: Contact administrator
- **"Session expired"**: Log in again
- **"Invalid admin credentials"**: Check admin username/password

---

*This manual is continuously updated. For the latest version, visit the system documentation portal or contact support.*

**Document Version**: 1.2.0  
**Last Updated**: December 2024  
**Next Review**: June 2025  

---

© 2024 TransitNet Optimizer Development Team  
Department of Computer Science, Quaid-i-Azam University Islamabad  
Supported by Road Safety Project (GCF-744) and Capital Development Authority
