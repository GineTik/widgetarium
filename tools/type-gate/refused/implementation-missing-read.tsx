import { IValueGateway, z } from "widgetarium";

export class NoRead extends IValueGateway.of(z.string().default("")).pick("get") {}
