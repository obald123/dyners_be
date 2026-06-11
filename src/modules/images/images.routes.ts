import { Router } from "express";
import { prisma } from "../../db/client";
import { validate, getValidated } from "../../middleware/validate";
import { idParamSchema, type IdParam } from "../../lib/schemas";
import { NotFoundError } from "../../lib/errors";

export const imagesRouter = Router();

/** Serves database-stored fallback images (used when Cloudinary is unavailable). */
imagesRouter.get("/:id", validate({ params: idParamSchema }), async (req, res) => {
  const { id } = getValidated<IdParam>(req, "params");
  const image = await prisma.storedImage.findUnique({ where: { id } });
  if (!image) throw new NotFoundError("Image");

  res
    .set({
      "Content-Type": image.mime,
      "Cache-Control": "public, max-age=31536000, immutable",
      "Cross-Origin-Resource-Policy": "cross-origin",
    })
    .send(Buffer.from(image.data));
});
