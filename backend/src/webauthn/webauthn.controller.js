import {
  Controller,
  Post,
  Bind,
  Dependencies,
  Req,
  Body,
} from '@nestjs/common';
import { WebauthnService } from './webauthn.service';

@Controller('webauthn')
@Dependencies(WebauthnService)
export class WebauthnController {
  constructor(webauthn) {
    this.webauthn = webauthn;
  }

  @Post('register/options')
  @Bind(Req())
  registerOptions(req) {
    return this.webauthn.getRegistrationOptions(req.user.id);
  }

  @Post('register/verify')
  @Bind(Req(), Body())
  registerVerify(req, body) {
    return this.webauthn.verifyRegistration(req.user.id, body);
  }
}
