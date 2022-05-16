import { Injectable, Logger } from "@nestjs/common";
import { Repository } from "typeorm";
import { FileEntity } from "./file.entity";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { S3 } from "aws-sdk";
import { v4 as uuid4 } from 'uuid';

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);
  constructor(
    @InjectRepository(FileEntity)
    private readonly fileRepository: Repository<FileEntity>,
    private readonly configService: ConfigService
  ) { }
  async uploadFile(dataBuffer: Buffer, name: string) {
    const s3 = new S3();
    this.logger.debug("Uploading");
    const upload = await s3.upload({
      Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
      Body: dataBuffer,
      Key: `${uuid4()}-${name}`
    })
      .promise();
    this.logger.debug("Uploaded");
    const file = this.fileRepository.create({
      key: upload.Key,
      url: upload.Location
    });
    this.logger.debug("Created in db");
    await this.fileRepository.save(file);
    this.logger.debug("Saved in db");
    return file;
  }
  async *_uploadFile (file: Express.Multer.File) {
    const s3 = new S3();
    const upload = await s3.upload({
      Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
      Body: file.buffer,
      Key: `${uuid4()}-${file.originalname}`
    });
    //return upload;
  }
  async uploadFiles(files: Array<Express.Multer.File>) {
    const uploadedFiles = [];
    for(let file of files) {
      const uploaded = await this.uploadFile(file.buffer, file.originalname);
      uploadedFiles.push(uploaded);
    }
    return uploadedFiles;
  }
  async removeFile(id: number) {
    const file = await this.fileRepository.findOne(id);
    const s3 = new S3();
    await s3.deleteObject({
      Bucket: this.configService.get('AWS_PUBLIC_BUCKET_NAME'),
      Key: file.key
    })
      .promise();
    await this.fileRepository.delete(id);
  }
}
