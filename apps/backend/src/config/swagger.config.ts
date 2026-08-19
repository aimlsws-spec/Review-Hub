import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { API_PREFIX } from '../common/constants';

export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('ReviewHub API')
    .setDescription(
      'ReviewHub Platform — Backend API Documentation.\n\n' +
      'All endpoints require Bearer JWT authentication unless marked as **Public**.\n\n' +
      'Click **Authorize** and enter your access token to authenticate.',
    )
    .setVersion('1.0')
    .setContact('ReviewHub Engineering', '', 'engineering@reviewhub.in')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        in: 'header',
        description: 'Enter your JWT access token',
      },
      'bearer',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup(`${API_PREFIX}/docs`, app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'ReviewHub API Docs',
  });
}
