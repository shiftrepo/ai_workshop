# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Overview

This repository (herb-ec-site) contains a prototype of an e-commerce website for Japanese herbs. It's a simple Node.js application that allows users to view the homepage with featured herb products. The application is designed for local development and demonstration purposes only.

## Environment Setup and Essential Commands

### Starting and Stopping the Server

```bash
# Install dependencies
npm install

# Start the server (runs in background)
npm start

# Stop the server
npm run stop

# Run in development mode with auto-restart on file changes
npm run dev
```

### Environment Variables

The application uses the following environment variables:

```
PORT=3000  # Optional - defaults to 3000 if not specified
```

## Repository Structure

The repository has the following structure:

```
herb-ec-site/
├── public/            # Static files
│   ├── css/           # CSS stylesheets
│   │   └── style.css  # Main stylesheet
│   ├── js/            # Client-side JavaScript
│   │   └── main.js    # Main JavaScript file
│   └── images/        # Product images (empty in prototype)
├── views/             # EJS templates
│   └── index.ejs      # Homepage template
├── routes/            # Route handlers
│   └── index.js       # Main routes
├── scripts/           # Server management scripts
│   ├── start.js       # Server startup script
│   └── stop.js        # Server shutdown script
├── app.js             # Main application entry point
└── package.json       # Dependencies and scripts
```

## Application Architecture

### Backend

The application uses Express.js as the web server framework. The main components are:

1. **app.js**: Entry point that initializes the Express application, configures middleware, and sets up routes.
2. **routes/index.js**: Defines the main routes for the application.
3. **scripts/**: Contains helper scripts for starting and stopping the server as background processes.

### Frontend

The frontend uses Bootstrap for styling and layout, with custom CSS and JavaScript:

1. **views/index.ejs**: The main EJS template that renders the homepage.
2. **public/css/style.css**: Custom styles beyond Bootstrap.
3. **public/js/main.js**: Client-side interactivity.

## Important Workflows

1. **Development Process**: Make changes to the files and run in development mode with `npm run dev` to see changes instantly with auto-restart.

2. **Server Management**:
   - Start with `npm start` (runs as a background process)
   - Stop with `npm run stop` (finds and terminates the server process)

3. **Template Rendering**:
   - The application uses EJS templates for dynamic content generation
   - Product data is currently hard-coded in the template

## Troubleshooting

refer @filename.md

* **Server Already Running**: If you get an error that the port is already in use, use `npm run stop` to stop any existing server process.
* **Process Management**: The server creates a `server.pid` file to track the running process. If the server crashes unexpectedly, you may need to delete this file manually.