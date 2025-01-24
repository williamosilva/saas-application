import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Akashi API')
    .setDescription(
      'Welcome to the Akashi API documentation! This API is responsible for creating and managing objects used in producing content for websites. It was developed with **NestJS**, has unit tests and uses **MongoDB** as the database.',
    )
    .setVersion('1.0')
    // .addServer('http://localhost:3000', 'Servidor Local')
    // .addServer('https://api.akashi.com', 'Servidor de Produção')
    .setContact(
      'Desenvolvedor Akashi',
      'https://www.williamsilva.dev',
      'williamsilva20062005@gmail.com',
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Akashi API Docs',
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
