import baseApiConfigConnection from '../constants/baseApiConfigConnection'

const enum METHODS {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
}

type Options = {
  method?: string
  body?: null | string | FormData
  headers?: Headers
  isFormData?: boolean
}

type Request = (url: string, options?: Options) => Promise<Response>

const configOptions = {
  method: METHODS.GET,
  credentials: 'include' as RequestCredentials | undefined,
  headers: baseApiConfigConnection.headers,
}

export class FetchApi {
  static API_URL = baseApiConfigConnection.url

  getApiUrl = () => {
    return FetchApi.API_URL
  }

  private buildUrl = (path: string) => {
    return FetchApi.API_URL + path
  }

  public get: Request = async (url: string, options = {}) => {
    const buildedUrl = this.buildUrl(url)
    return fetch(buildedUrl, {
      ...options,
      ...configOptions,
    })
  }

  public post: Request = async (url: string, options = {}) => {
    const buildedUrl = this.buildUrl(url)
    return fetch(buildedUrl, {
      ...options,
      ...configOptions,
      method: METHODS.POST,
    })
  }

  public put: Request = async (url: string, options = {}) => {
    const buildedUrl = this.buildUrl(url)
    return fetch(buildedUrl, {
      ...options,
      ...configOptions,
      method: METHODS.PUT,
    })
  }
  public putData: Request = async (url: string, options = {}) => {
    const buildedUrl = this.buildUrl(url)
    return fetch(buildedUrl, {
      ...options,
      credentials: 'include' as RequestCredentials | undefined,
      method: METHODS.PUT,
    })
  }
}

export default new FetchApi()
