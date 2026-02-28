import { apiClient, API_ROUTES } from '../../common';
import { UploadedImage } from './images.model';

class ImagesService {
  /**
   * Upload an image to the general images endpoint.
   * @param file - The image file to upload
   * @param folder - Optional folder path for organisation (e.g. 'products', 'logos')
   */
  async upload(file: File, folder?: string): Promise<UploadedImage> {
    const formData = new FormData();
    formData.append('image', file);
    const config = folder ? { params: { folder } } : undefined;
    const response = await apiClient.upload<any>(API_ROUTES.IMAGES.UPLOAD, formData, config);
    return UploadedImage.fromApiResponse(response.data);
  }
}

export const imagesService = new ImagesService();
