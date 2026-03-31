# Copilot Instructions

- The purpose of this project is to implement an automatic light control
- The system consists of three main modules: firmware, gateway, and server

## Project Structure

- `firmware/` contains code for ESP32 micro controller written in C
- `gateway/` contains HTTP server and MQTT client written in TypeScript that forwards messages between the end nodes and the server
- `server/` contains the central server application written in TypeScript and Next.js that provides a web interface for controlling the system and visualizing data
