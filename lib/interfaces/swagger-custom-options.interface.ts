import { SwaggerUIBasicAuthOptions } from './swagger-ui-basic-auth-options.interface';

export interface SwaggerCustomOptions {
  explorer?: boolean;
  swaggerOptions?: any;
  customCss?: string;
  customJs?: string;
  customfavIcon?: string;
  swaggerUrl?: string;
  customSiteTitle?: string;
  uiBasicAuthOptions: SwaggerUIBasicAuthOptions;
}
