/**
 * Base API Service - Common HTTP operations
 * Extend this class for specific services
 */
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, PageResponse } from './api.config';

export abstract class BaseApiService {
  protected abstract basePath: string;

  constructor(protected http: HttpClient) {}

  protected get baseUrl(): string {
    return environment.apiUrl;
  }

  protected getUrl(path: string = ''): string {
    return `${this.baseUrl}${this.basePath}${path}`;
  }

  protected get<T>(path: string = '', params?: HttpParams): Observable<ApiResponse<T>> {
    return this.http.get<ApiResponse<T>>(this.getUrl(path), { params });
  }

  protected post<T>(path: string, body: any): Observable<ApiResponse<T>> {
    return this.http.post<ApiResponse<T>>(this.getUrl(path), body);
  }

  protected put<T>(path: string, body: any): Observable<ApiResponse<T>> {
    return this.http.put<ApiResponse<T>>(this.getUrl(path), body);
  }

  protected patch<T>(path: string, body: any): Observable<ApiResponse<T>> {
    return this.http.patch<ApiResponse<T>>(this.getUrl(path), body);
  }

  protected delete<T>(path: string): Observable<ApiResponse<T>> {
    return this.http.delete<ApiResponse<T>>(this.getUrl(path));
  }

  // Helper for paginated requests
  protected getPaged<T>(
    path: string,
    page: number = 0,
    size: number = 20,
    additionalParams?: { [key: string]: string }
  ): Observable<ApiResponse<PageResponse<T>>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('size', size.toString());

    if (additionalParams) {
      Object.keys(additionalParams).forEach(key => {
        params = params.set(key, additionalParams[key]);
      });
    }

    return this.http.get<ApiResponse<PageResponse<T>>>(this.getUrl(path), { params });
  }
}
