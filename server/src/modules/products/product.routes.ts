import { Router } from "express";
import { getProducts } from "./product.service";
import { getProductsQuerySchema } from "./product.validators";
import { ApiError } from "../../middlewares/error";

const router = Router();

router.get("/", async (req, res, next) => {
  try {
    const query = getProductsQuerySchema.parse(req.query);
    const products = await getProducts(query);
    res.json(products);
  } catch (err) {
    if (err instanceof Error) {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
});

export default router;
