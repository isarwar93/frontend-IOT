# Frontend IOT

A flexible frontend application to visualize and analyze IOT sensor data. This is a work-in-progress hobby project built with modern web technologies.

## Technologies Used

- **Vite** - Build tool and dev server
- **React** - UI framework
- **TypeScript** - Type-safe JavaScript
- **Tailwind CSS** - Utility-first CSS framework
- **Recharts** - Chart library for data visualization
- **Zustand** - State management
- **React Router** - Client-side routing
- **WebSockets** - Real-time data communication
- **BLE/MQTT/USB** - Protocol support for sensor connectivity

## Features

- Real-time sensor data visualization with interactive graphs
- Video streaming and analysis
- BLE, MQTT, and USB protocol configuration
- Dashboard with multiple views (Graph, Video, Analysis, Chat)
- Theme support (light/dark mode)
- Configurable layouts and settings

## Installation

Ensure you have Node.js and npm installed.

```bash
sudo apt update
sudo apt install nodejs npm -y
```

Clone the repository and install dependencies:

```bash
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Sensor Data Format

The application expects sensor data in the following format:

```json
{
  "id": "string",
  "name": "string",
  "type": "temperature" | "humidity" | "voltage" | "custom",
  "unit": "string"
}
```

## Project Structure

- `src/components/` - Reusable UI components
- `src/pages/` - Page components
- `src/store/` - Zustand stores for state management
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/tabs-dashboard/` - Dashboard tab components
- `src/tabs-protocol-config/` - Protocol configuration components
