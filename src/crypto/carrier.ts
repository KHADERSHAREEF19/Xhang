import { fileHash, type ParsedFile } from "./format";
export async function verifyCarrier(file: ParsedFile): Promise<void> {
  if ((await fileHash(file.original)) !== file.header.carrierHash)
    throw new Error("Nothing unlocked.");
}
