import { Router } from "express";
import { getProducts, getProduct, addProduct, modifyProduct, removeProduct } from "./product.service";
import { getProductsQuerySchema } from "./product.validators";
import { ApiError } from "../../middlewares/error";

const router = Router();

// Get all products (paginated, with search)
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

// Get single product by ID
router.get("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }
    
    const product = await getProduct(id);
    if (!product) {
      return next(new ApiError(404, "Product not found"));
    }
    
    res.json({ product });
  } catch (err) {
    next(err);
  }
});

// Create new product
router.post("/", async (req, res, next) => {
  try {
    const product = await addProduct(req.body);
    res.status(201).json({ product, message: "Product created successfully" });
  } catch (err) {
    if (err instanceof Error) {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
});

// Update product
router.put("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }
    
    const product = await modifyProduct(id, req.body);
    if (!product) {
      return next(new ApiError(404, "Product not found"));
    }
    
    res.json({ product, message: "Product updated successfully" });
  } catch (err) {
    if (err instanceof Error) {
      return next(new ApiError(400, err.message));
    }
    next(err);
  }
});

// Delete product (soft delete)
router.delete("/:id", async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return next(new ApiError(400, "Invalid product ID"));
    }
    
    const success = await removeProduct(id);
    if (!success) {
      return next(new ApiError(404, "Product not found"));
    }
    
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    next(err);
  }
});

export default router;
