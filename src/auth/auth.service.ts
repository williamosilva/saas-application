import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './schemas/user.schema';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  private validateApiKey(providedSecret: string | undefined): void {
    const expectedSecret = this.configService.get<string>('SECRET_KEY');

    if (!providedSecret) {
      throw new UnauthorizedException('Secret key is missing in headers');
    }

    if (providedSecret !== expectedSecret) {
      throw new UnauthorizedException('Provided secret key is invalid');
    }
  }

  async register(registerDto: RegisterDto, apiKey: string) {
    this.validateApiKey(apiKey);
    const { email, password, fullName } = registerDto;

    const existingUser = await this.userModel.findOne({ email });

    // Verifica se o email já está registrado com outro provider
    if (existingUser) {
      if (existingUser.provider !== 'local') {
        throw new UnauthorizedException(
          `Este email já está registrado via ${existingUser.provider}. Faça login usando ${existingUser.provider}.`,
        );
      } else {
        throw new UnauthorizedException('Email já registrado');
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.userModel.create({
      email,
      password: hashedPassword,
      fullName,
      plan: 'free',
      provider: 'local', // Adicione esta linha para marcar o provider
    });

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      id: user.id,
      ...tokens,
    };
  }

  async login(loginDto: LoginDto, apiKey: string) {
    this.validateApiKey(apiKey);
    const { email, password } = loginDto;

    const user = await this.userModel.findOne({ email });

    // Verifica se o usuário existe
    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // Verifica se o usuário não é local
    if (user.provider !== 'local') {
      throw new UnauthorizedException(
        `Esta conta está registrada via ${user.provider}. Faça login usando ${user.provider}.`,
      );
    }

    // Verifica se a senha está definida
    if (!user.password) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const tokens = await this.generateTokens(user.id, user.email);

    return {
      id: user.id,
      ...tokens,
    };
  }

  async generateTokens(userId: string, email: string) {
    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_SECRET'),
          expiresIn: this.configService.get<string>('JWT_EXPIRATION'),
        },
      ),
      this.jwtService.signAsync(
        {
          sub: userId,
          email,
        },
        {
          secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
          expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async handleSocialLogin(profile: any, provider: 'google' | 'github') {
    console.log('Profile:', profile);

    console.log('Dados do Perfil:', {
      email: profile.email,
      displayName: profile.displayName,
      photo: profile.photo,
    });

    try {
      const email = profile.email || `${profile.id}@${provider}.social`;

      // Primeiro, procura por qualquer usuário com este email, independente do provider
      const existingUser = await this.userModel.findOne({
        email: email,
      });

      if (existingUser) {
        // Se encontrou um usuário com este email, verifica se o provider é diferente
        if (existingUser.provider !== provider) {
          throw new ConflictException(
            `Este email já está associado a uma conta ${existingUser.provider}. Por favor, faça login usando ${existingUser.provider}.`,
          );
        }

        // Se chegou aqui, o provider é o mesmo, então atualiza os dados
        existingUser.fullName = profile.displayName;
        existingUser.providerId = profile.id;
        if (profile.photo) existingUser.photo = profile.photo;
        await existingUser.save();

        const tokens = await this.generateTokens(
          existingUser.id,
          existingUser.email,
        );
        return {
          id: existingUser.id,
          email: existingUser.email,
          fullName: existingUser.fullName,
          photo: existingUser.photo,
          ...tokens,
        };
      }

      // Se não encontrou usuário, cria um novo
      const newUser = await this.userModel.create({
        email,
        fullName: profile.displayName,
        provider,
        providerId: profile.id,
        photo: profile.photo,
        plan: 'free',
      });

      const tokens = await this.generateTokens(newUser.id, newUser.email);
      return {
        id: newUser.id,
        email: newUser.email,
        fullName: newUser.fullName,
        photo: newUser.photo,
        ...tokens,
      };
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      console.error('Error in handleSocialLogin:', error);
      throw new InternalServerErrorException('Erro ao processar login social');
    }
  }
  async refreshTokens(userId: string, email: string) {
    return this.generateTokens(userId, email);
  }
}
