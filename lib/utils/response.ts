/**
 * API响应工具函数
 */
import { NextResponse } from 'next/server';

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export function successResponse<T>(data: T, message?: string): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
  });
}

export function errorResponse(error: string, status = 400): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
    },
    { status }
  );
}

export function unauthorizedResponse(message = '未授权访问'): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

export function forbiddenResponse(message = '权限不足'): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

export function notFoundResponse(message = '资源不存在'): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

export function serverErrorResponse(message = '服务器内部错误'): NextResponse<ApiResponse> {
  return errorResponse(message, 500);
}
