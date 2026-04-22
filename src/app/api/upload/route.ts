import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Maximum file size (5MB)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Allowed file types
const ALLOWED_FILE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

export async function POST(request: NextRequest) {
  try {
    // Check if request contains form data
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

    // Convert File to Buffer
    const bytes = await imageFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Generate unique filename
    const fileExtension = imageFile.name.split('.').pop() || 'jpg';
    const fileName = `${uuidv4()}.${fileExtension}`;

    // Create uploads directory if it doesn't exist
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filePath = path.join(uploadsDir, fileName);
    await writeFile(filePath, buffer);

    // Generate public URL
    const imageUrl = `/uploads/${fileName}`;

    // Generate simple description based on file info
    const description = `上传的图片: ${imageFile.name} (${(imageFile.size / 1024).toFixed(0)}KB)`;

    console.log('Image uploaded successfully:', {
      fileName,
      fileSize: imageFile.size,
      fileType: imageFile.type,
      imageUrl,
    });

    return NextResponse.json({
      success: true,
      imageUrl,
      fileName,
      fileSize: imageFile.size,
      fileType: imageFile.type,
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
  // The request parameter is intentionally unused for this GET endpoint
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
    exampleRequest: {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      body: 'FormData with "image" field',
    },
    note: '上传的图片将保存在public/uploads目录中，并可通过生成的URL访问。',
  });
}