import { fetchApi } from '../../utils/fetchApi'
import { AuthFormValues } from '../../components/AuthForm'

class AuthApi {
  protected fetchApi: fetchApi
  constructor() {
    this.fetchApi = new fetchApi('/auth')
  }

  public signin(data: AuthFormValues) {
    return this.fetchApi.post('/signin', {body: JSON.stringify(data)})
  }
}

export default new AuthApi()
