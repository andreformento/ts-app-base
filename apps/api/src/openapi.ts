import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import { FailureEntity } from './failure.entity';

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
  return SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('appname')
      .setVersion('0.0.1')
      .addBearerAuth()
      .addCookieAuth('appname_access')
      .addGlobalResponse({
        status: 'default',
        type: FailureEntity,
        description: 'The request was refused',
      })
      .build(),
  );
}
