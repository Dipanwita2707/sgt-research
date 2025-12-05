// Health check endpoint for Docker
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Basic health check - can be extended with more checks
    const healthCheck = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development',
    };

    return NextResponse.json(healthCheck, { status: 200 });
  } catch (error) {
    const errorResponse = {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error.message,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}