import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { JobsService } from "./jobs.service";
