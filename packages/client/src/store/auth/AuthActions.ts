import { createAsyncThunk } from '@reduxjs/toolkit'
import { authSlice } from './AuthSlice'
import AuthApi from '../../api/AuthApi'
import UserApi from '../../api/UserApi'
import { TSignIn } from '../../models/SignInModel'
import { TProfile } from '../../models/ProfileModel'
import { TSignUpFormValues } from '../../models/RegistrationModel'

export const updateUser = createAsyncThunk(
  'user/updateUser',
  async (body: TProfile, { dispatch, rejectWithValue }) => {
    try {
      const response = await UserApi.updateUser(body)
      if (response.status !== 200) {
        const error = await response.json()
        return rejectWithValue(error.reason)
      }
      return body
    } catch (e) {
      rejectWithValue(e)
    }
  }
)
export const signInUser = createAsyncThunk(
  'user/signIn',
  async (body: TSignIn, { dispatch, rejectWithValue }) => {
    try {
      const response = await AuthApi.signin(body)
      if (response.status !== 200) {
        const error = await response.json()
        return rejectWithValue(error.reason)
      }
      await dispatch(getUser())
      return
    } catch (e) {
      rejectWithValue(e)
    }
  }
)

export const logOut = createAsyncThunk('auth/logout', async (_, { rejectWithValue }) => {
  try {
    const response = await AuthApi.logout()

    if (response.status !== 200) {
      const error = await response.json()
      return rejectWithValue(error.reason)
    }
    return
  } catch (e) {
    rejectWithValue(e)
  }
})

export const getUser = createAsyncThunk('user/getUser', async (_, { rejectWithValue }) => {
  try {
    const response = await UserApi.getUser()
    const data = await response.json()

    if (response.status !== 200) {
      return rejectWithValue(data)
    }
    return data
  } catch (e) {
    rejectWithValue(e)
  }
})
export const registration = createAsyncThunk(
  'auth/signup',
  async (body: TSignUpFormValues, { dispatch, rejectWithValue }) => {
    try {
      const response = await AuthApi.signup(body)
      if (response.status !== 200) {
        const error = await response.json()
        return rejectWithValue(error.reason)
      }
      await dispatch(getUser())
      return
    } catch (e) {
      rejectWithValue(e)
    }
  }
)

export const { setIsAuth, resetSignInError, resetSignUpError } = authSlice.actions