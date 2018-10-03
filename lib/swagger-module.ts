import { INestApplication } from '@nestjs/common';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { FastifyAdapter } from '@nestjs/core';
import * as swaggerUi from 'swagger-ui-express';
import * as basicAuth from 'express-basic-auth';
import {
  SwaggerBaseConfig,
  SwaggerCustomOptions,
  SwaggerDocument,
  SwaggerDocumentOptions
} from './interfaces';
import { SwaggerScanner } from './swagger-scanner';

export class SwaggerModule {
  private static readonly swaggerScanner = new SwaggerScanner();

  public static createDocument(
    app: INestApplication,
    config: SwaggerBaseConfig,
    options: SwaggerDocumentOptions = {}
  ): SwaggerDocument {
    const document = this.swaggerScanner.scanApplication(
      app,
      options.include || []
    );
    return {
      ...config,
      ...document,
      swagger: '2.0'
    };
  }

  public static setup(
    path: string,
    app: INestApplication,
    document: SwaggerDocument,
    options?: SwaggerCustomOptions
  ) {
    const validatePath = (path): string =>
      path.charAt(0) !== '/' ? '/' + path : path;

    const httpServer = app.getHttpServer();
    if (httpServer instanceof FastifyAdapter) {
      return this.setupFastify(path, httpServer, document, options);
    }
    const finalPath = validatePath(path);

    if (options && options.uiBasicAuthOptions) {
      const username = options.uiBasicAuthOptions.username;
      const password = options.uiBasicAuthOptions.password;
      const basicAuthOptions = {
        users: {},
        challenge: true
      };
      basicAuthOptions.users[username] = password;
      app.use(finalPath, basicAuth(basicAuthOptions));
    }
    const swaggerHtml = swaggerUi.generateHTML(document, options);
    app.use(finalPath, swaggerUi.serveFiles(document, options));
    app.use(finalPath, (req, res) => res.send(swaggerHtml));
    app.use(finalPath + '-json', (req, res) => res.json(document));
  }

  private static setupFastify(
    path: string,
    httpServer: FastifyAdapter,
    document: SwaggerDocument,
    options: SwaggerCustomOptions
  ) {
    if (options && options.uiBasicAuthOptions) {
      const validate = this.authValidator(options);
      httpServer.register(loadPackage('fastify-basic-auth', 'SwaggerModule'), {
        validate,
        authenticate: true
      });
      httpServer.getInstance().after(() => {
        httpServer
          .getInstance()
          .addHook('preHandler', httpServer.getInstance().basicAuth);
      });
    }
    httpServer.register(loadPackage('fastify-swagger', 'SwaggerModule'), {
      swagger: document,
      exposeRoute: true,
      routePrefix: path,
      mode: 'static',
      specification: {
        document
      }
    });
  }

  static authValidator(options: SwaggerCustomOptions) {
    return async (username: string, password: string) => {
      if (
        username !== options.uiBasicAuthOptions.username ||
        password !== options.uiBasicAuthOptions.password
      ) {
        return new Error('Invalid Credentials.');
      }
    };
  }
}
