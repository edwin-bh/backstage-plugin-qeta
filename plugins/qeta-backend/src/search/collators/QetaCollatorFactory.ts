import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { Readable } from 'stream';
import { DocumentCollatorFactory } from '@backstage/plugin-search-common';
import fetch from 'node-fetch';

export type QetaCollatorFactoryOptions = {
  logger: Logger;
};

export type QetaDocument = {
  title?: string;
  location: string;
  content: string;
  tags?: string[];
  creator: string;
};

export class QetaCollatorFactory implements DocumentCollatorFactory {
  private readonly appBaseUrl: string;
  private readonly backendBaseUrl: string;
  private readonly logger: Logger;
  public readonly type: string = 'qeta';

  private constructor(config: Config, options: QetaCollatorFactoryOptions) {
    this.logger = options.logger;
    this.appBaseUrl = config.getString('app.baseUrl');
    this.backendBaseUrl = config.getString('backend.baseUrl');
  }

  static fromConfig(config: Config, options: QetaCollatorFactoryOptions) {
    return new QetaCollatorFactory(config, options);
  }

  async getCollator() {
    return Readable.from(this.execute());
  }

  async *execute(): AsyncGenerator<QetaDocument> {
    this.logger.info('Executing QetaCollator');
    const response = await fetch(
      `${this.backendBaseUrl}/api/qeta/questions?includeAnswers=true`,
    );
    const data = await response.json();
    this.logger.info(`Found ${data.questions.length} questions to index`);

    for (const question of data.questions) {
      yield {
        title: question.title,
        location: `${this.appBaseUrl}/qeta/${question.id}`,
        content: question.content,
        tags: question.tags,
        creator: question.user,
      };

      for (const answer of question.answers ?? []) {
        yield {
          content: answer.content,
          location: `${this.appBaseUrl}/qeta/${question.id}#${answer.id}`,
          creator: answer.user,
        };
      }
    }
  }
}