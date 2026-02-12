import swaggerJsdoc from 'swagger-jsdoc';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Expand Machinery API',
      version: '1.0.0',
      description: 'API documentation for Expand Machinery Support System'
    },
    servers: [
      {
        url: 'https://backend.expand.shabad-guru.org/app',
        description: 'Production server',
      },
      {
        url: process.env.APP_URL || 'http://localhost:9000/app',
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT Authorization (Optional - only needed for protected routes)',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
      },
    },
    // Remove global security - will be added per-route basis
    // security: [],
  },
  apis: ['./src/routes/**/*.js', './src/controllers/**/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;

