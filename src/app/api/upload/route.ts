import { NextRequest, NextResponse } from 'next/server';
import { v2 as cloudinary } from 'cloudinary';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        { error: '请求必须是multipart/form-data格式' },
        { status: 400 }
      );
    }

    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: '未找到图片文件' },
        { status: 400 }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(imageFile.type)) {
      return NextResponse.json(
        { error: '不支持的文件类型。请上传JPEG、PNG、WebP或GIF图片' },
        { status: 400 }
      );
    }

    // Validate file size
    if (imageFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: '文件大小超过5MB限制' },
        { status: 400 }
      );
    }

    // Convert File to base64 for Cloudinary upload
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataUri = `data:${imageFile.type};base64,${base64}`;

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: 'vibe-tracker',
      resource_type: 'image',
    });

    // Generate description
    const ctx = result.context as Record<string, string> | undefined;
    const description = ctx?.caption || `上传的图片: ${imageFile.name}`;

    console.log('Image uploaded successfully:', {
      publicId: result.public_id,
      fileSize: imageFile.size,
      imageUrl: result.secure_url,
    });

    return NextResponse.json({
      success: true,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      fileName: imageFile.name,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      width: result.width,
      height: result.height,
      description,
      uploadedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Upload error:', error);

    return NextResponse.json(
      {
        error: '图片上传失败',
        details: error instanceof Error ? error.message : '未知错误',
      },
      { status: 500 }
    );
  }
}

export async function GET(_request: NextRequest) {
  void _request;
  return NextResponse.json({
    message: 'Vibe Tracker 图片上传API',
    version: '1.0.0',
    endpoints: {
      POST: '/api/upload - 上传图片文件',
    },
    limits: {
      maxFileSize: '5MB',
      allowedTypes: ALLOWED_FILE_TYPES,
    },
    note: '图片将通过Cloudinary托管。',
  });
}