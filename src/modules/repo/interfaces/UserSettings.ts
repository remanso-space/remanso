import { DataType } from "@/data/DataType.enum"
import { Model } from "@/data/models/Model"

export interface UserSettings extends Model<DataType.UserSettings> {
  fontFamilies?: string[]
  fontFamily?: string
  chosenFontFamily?: string
  fontSize?: string
  chosenFontSize?: string
  backlink?: boolean
  chosenHeadingFont?: string
  chosenBodyFont?: string
  pageWidth?: string
}
