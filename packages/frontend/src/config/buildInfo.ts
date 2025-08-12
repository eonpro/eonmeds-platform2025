// Build information
// This file is generated during the build process
export const BUILD_INFO = {
  buildTime: process.env.REACT_APP_BUILD_TIME || new Date().toISOString(),
  version: process.env.REACT_APP_VERSION || '1.0.0',
  environment: process.env.NODE_ENV || 'development',
};
