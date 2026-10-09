import { IValueGateway } from "widgetarium";
import { z } from "zod";

export class NoRead extends IValueGateway.of(z.string().default("")).pick("get") {}
