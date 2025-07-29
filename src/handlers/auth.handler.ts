import type { Context } from "elysia"
import { AuthService } from "@/services/auth.service";
import type {
    AuthenticateRequest,
    RefreshRequest,
    ValidateRequest,
    InvalidateRequest,
    SignoutRequest,
    RegisterRequest,
    YggdrasilError,
} from "@/types/yggdrasil.types"
import { ERRORS } from "@/types/yggdrasil.types";

/**
 * POST /authserver/register
 * Register new user with email and password
 */
export const registerHandler = async ({ body, set}: Context & { body: RegisterRequest }) => {
  try {
    const { email, username, password, profileName } = body
    const result = await AuthService.register(
      email,
      username,
      password,
      profileName
    )
    set.status = 201
    return result
  } catch (error) {
    set.status = 400
    return error as YggdrasilError
  }
}

/**
 * POST /authserver/authenticate
 * Authenticate user with username and password
 */
export const authenticateHandler = async ({ body, set }: Context & { body: AuthenticateRequest }) => {
  try {
    const { username, password, clientToken, requestUser } = body
    const result = await AuthService.authenticate(
      username,
      password,
      clientToken,
      requestUser
    )
    set.status = 200
    return result
  } catch (error) {
    set.status = 403
    return error as YggdrasilError
  }
}

/**
 * POST /authserver/refresh
 * Refresh access token using existing tokens
 */
export const refreshHandler = async ({ body, set }: Context & { body: RefreshRequest }) => {
  try {
    const { accessToken, clientToken, requestUser } = body
    const result = await AuthService.refresh(
      accessToken,
      clientToken,
      requestUser
    )
    set.status = 200
    return result
  } catch (error) {
    set.status = 403
    return error as YggdrasilError
  }
}

/**
 * POST /authserver/validate
 * Validate access token
 */
export const validateHandler = async ({ body, set }: Context & { body: ValidateRequest }) => {
  try {
    const { accessToken, clientToken } = body
    const isValid = await AuthService.validate(accessToken, clientToken)
    if (isValid) {
      set.status = 204 // No Content - token is valid
      return
    } else {
      set.status = 403
      return ERRORS.INVALID_TOKEN
    }
  } catch (error) {
    set.status = 403
    return ERRORS.INVALID_TOKEN
  }
}

/**
 * POST /authserver/invalidate
 * Invalidate specific access token
 */
export const invalidateHandler = async ({ body, set }: Context & { body: InvalidateRequest }) => {
  try {
    const { accessToken, clientToken } = body
    await AuthService.invalidate(accessToken, clientToken)
    set.status = 204 // No Content - successfully invalidated
    return
  } catch (error) {
    set.status = 403
    return error as YggdrasilError
  }
}

/**
 * POST /authserver/signout
 * Sign out user (invalidate all user's tokens)
 */
export const signoutHandler = async ({ body, set }: Context & { body: SignoutRequest }) => {
  try {
    const { username, password } = body
    await AuthService.signout(username, password)
    set.status = 204 // No Content - successfully signed out
    return
  } catch (error) {
    set.status = 403
    return error as YggdrasilError
  }
}