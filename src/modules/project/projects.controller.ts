import {
  Controller,
  Post,
  Body,
  BadRequestException,
  Param,
  Delete,
  Get,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { ProjectsService } from 'src/modules/project/projects.service';
import { CreateProjectDto } from './dto/project.dto';
import { JwtAuthGuard } from 'src/common/guards/auth.guard';
import { Public } from 'src/common/decorators/public.decorator';

@ApiTags('Projects')
@Controller('projects')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('access-token')
@ApiBearerAuth('refresh-token')
@ApiSecurity('secret-key')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new project' })
  @ApiBody({ type: CreateProjectDto })
  @ApiResponse({
    status: 201,
    description: 'Project created successfully',
    schema: {
      example: {
        _id: '663d1a5e8a9f6a4d9f4c7b1c',
        name: 'Marketing Project',
        userId: '60d5ecbdxx54b3b2c001f3e1234',
        dataInfo: {
          '663d1a5e8a9f6a4d9f4c7b1d': {
            orcamento: {
              valor: 50000,
              moeda: 'BRL',
            },
          },
          '663d1a5e8a9f6a4d9f4c7b1e': {
            integracaoexemplo: {
              apiUrl: 'https://api.example.com/cliente',
              JSONPath: '$.store.book[0].client',
              x_api_key: 'your-api-key-here',
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: 'External API integration requires Premium plan',
  })
  async createProject(@Body() createProjectDto: CreateProjectDto) {
    const { userId, ...projectData } = createProjectDto;
    if (!userId) {
      throw new BadRequestException('User ID is required');
    }
    return this.projectsService.createProject(userId, projectData);
  }

  @Public()
  @Get(':projectId/formatted')
  @ApiOperation({ summary: 'Get formatted project data by ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description:
      'Formatted project data returned successfully (duplicate names get numerical suffixes)',
    schema: {
      example: {
        teste: {
          'mudei o nome': {
            'kanye west 2': {
              apiUrl: 'https://api.kanye.rest/',
              JSONPath: '',
              'x-api-key': '',
              dataReturn: {
                quote:
                  'We used to diss Michael Jackson the media made us call him crazy ... then they killed him',
              },
            },
            tsetese: 'testset',
            'kanye west 1': {
              apiUrl: 'https://api.kanye.rest/',
              JSONPath: '',
              'x-api-key': '',
              dataReturn: {
                quote: "I feel like I'm too busy writing history to read it.",
              },
            },
          },
          'New Object': {
            // Exemplo de objeto vazio
          },
          'New Object 2': {
            // Exemplo de segunda ocorrência
          },
          'New Object 3': {
            // Exemplo de terceira ocorrência
          },
        },
      },
    },
  })
  async getFormattedProject(@Param('projectId') projectId: string) {
    return this.projectsService.getFormattedProject(projectId);
  }
  @Get(':projectId/datainfo')
  @ApiOperation({ summary: 'Get project dataInfo by project ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiResponse({
    status: 200,
    description: 'Project information returned successfully',
    schema: {
      example: {
        name: 'Marketing Project',
        dataInfo: {
          '663d1a5e8a9f6a4d9f4c7b1d': {
            orcamento: {
              valor: 50000,
              moeda: 'BRL',
            },
          },
          '663d1a5e8a9f6a4d9f4c7b1e': {
            integracaoexemplo: {
              apiUrl: 'https://api.example.com/cliente',
              JSONPath: '$.store.book[0].client',
              x_api_key: 'your-api-key-here',
              dataReturn: {
                nome: 'Cliente Exemplo',
                email: 'cliente@example.com',
              },
            },
          },
        },
      },
    },
  })
  async getProjectDataInfo(@Param('projectId') projectId: string) {
    return this.projectsService.getProjectDataInfo(projectId);
  }

  @Post(':projectId/dataentry')
  @ApiOperation({ summary: 'Add new entry to project dataInfo' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiBody({
    schema: {
      type: 'object',
      example: {
        novoOrcamento: {
          valor: 25000,
          moeda: 'BRL',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Entry added successfully',
    schema: {
      example: {
        entryId: '663d1a5e8a9f6a4d9f4c7b20',
        entry: {
          novoOrcamento: {
            valor: 25000,
            moeda: 'BRL',
          },
        },
        project: {
          _id: '663d1a5e8a9f6a4d9f4c7b1c',
          name: 'Marketing Project',
          dataInfo: {
            // Existing entries...
            '663d1a5e8a9f6a4d9f4c7b20': {
              novoOrcamento: {
                valor: 25000,
                moeda: 'BRL',
              },
            },
          },
        },
      },
    },
  })
  async addProjectDataEntry(
    @Param('projectId') projectId: string,
    @Body() newEntryData: Record<string, any>,
  ) {
    return this.projectsService.addProjectDataEntry(projectId, newEntryData);
  }

  @Put(':projectId/datainfo/entry/:entryId')
  @ApiOperation({ summary: 'Update specific entry in dataInfo by entry ID' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'entryId', description: 'Entry ID within dataInfo' })
  @ApiBody({
    description: 'Data to update the entry',
    schema: {
      example: {
        integracaoexemplo: {
          apiUrl: 'https://api.new-example.com/data',
          JSONPath: '$..newResults',
          x_api_key: 'new-api-key',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Entry updated successfully',
    schema: {
      example: {
        _id: 'project123',
        name: 'Updated Project',
        dataInfo: {
          entry123: {
            orcamento: {
              valor: 85000,
            },
          },
          entry456: {
            integracaoexemplo: {
              apiUrl: 'https://api.new-example.com/data',
              JSONPath: '$..newResults',
              x_api_key: 'new-api-key',
            },
          },
        },
      },
    },
  })
  async updateDataInfoEntry(
    @Param('projectId') projectId: string,
    @Param('entryId') entryId: string,
    @Body() updateData: Record<string, any>,
  ) {
    return this.projectsService.updateDataInfoEntry(
      projectId,
      entryId,
      updateData,
    );
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get projects by User ID' })
  @ApiParam({ name: 'userId', description: 'User ID' })
  @ApiResponse({
    status: 200,
    description: 'Projects found successfully',
    schema: {
      example: [
        {
          _id: '60d5ecb54b3xxb2c001f3e123',
          name: 'Project Name',
        },
      ],
    },
  })
  async getProjectByUser(@Param('userId') userId: string) {
    return this.projectsService.getProjectByUserId(userId);
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Delete project by ID' })
  @ApiResponse({
    status: 200,
    description: 'Project deleted successfully',
    schema: {
      example: {
        message: 'Project deleted successfully',
      },
    },
  })
  async deleteProject(@Param('projectId') projectId: string) {
    return this.projectsService.deleteProject(projectId);
  }

  @Delete(':projectId/dataentry/:entryId')
  @ApiOperation({ summary: 'Delete specific entry from project dataInfo' })
  @ApiParam({ name: 'projectId', description: 'Project ID' })
  @ApiParam({ name: 'entryId', description: 'Entry ID to be deleted' })
  @ApiResponse({
    status: 200,
    description: 'Entry deleted successfully',
    schema: {
      example: {
        message: 'Entry deleted successfully',
        entryId: '663d1a5e8a9f6a4d9f4c7b20',
        project: {
          _id: '663d1a5e8a9f6a4d9f4c7b1c',
          name: 'Marketing Project',
          dataInfo: {
            // Remaining entries...
          },
        },
      },
    },
  })
  async deleteProjectDataEntry(
    @Param('projectId') projectId: string,
    @Param('entryId') entryId: string,
  ) {
    return this.projectsService.deleteProjectDataEntry(projectId, entryId);
  }
}
