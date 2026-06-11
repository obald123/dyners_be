import { Router, type CookieOptions } from "express";
import { env } from "../../config/env";
import { validate, getValidated } from "../../middleware/validate";
import { requireAuth } from "../../middleware/auth";
import { loginLimiter, refreshLimiter } from "../../middleware/rateLimiters";
import { loginSchema, updateProfileSchema, type LoginInput, type UpdateProfileInput } from "./auth.schemas";
import * as authService from "./auth.service";

const REFRESH_COOKIE = "refresh_token";

const cookieOptions = (expires: Date): CookieOptions => ({
  httpOnly: true,
  secure: env.isProduction,
  sameSite: "strict",
  path: "/api/v1/auth",
  expires,
});

export const authRouter = Router();

authRouter.post("/login", loginLimiter, validate({ body: loginSchema }), async (req, res) => {
  const input = getValidated<LoginInput>(req, "body");
  const { admin, accessToken, refreshToken, refreshExpiresAt } = await authService.login(input);
  res
    .cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshExpiresAt))
    .json({ admin, accessToken });
});

authRouter.post("/refresh", refreshLimiter, async (req, res) => {
  const raw = req.cookies?.[REFRESH_COOKIE] as string | undefined;
  const { accessToken, refreshToken, refreshExpiresAt } = await authService.refresh(raw ?? "");
  res
    .cookie(REFRESH_COOKIE, refreshToken, cookieOptions(refreshExpiresAt))
    .json({ accessToken });
});

authRouter.post("/logout", async (req, res) => {
  await authService.logout(req.cookies?.[REFRESH_COOKIE] as string | undefined);
  res.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" }).json({ success: true });
});

authRouter.get("/me", requireAuth, async (req, res) => {
  res.json(await authService.getProfile(req.adminId as string));
});

authRouter.patch("/me", requireAuth, validate({ body: updateProfileSchema }), async (req, res) => {
  const input = getValidated<UpdateProfileInput>(req, "body");
  res.json(await authService.updateProfile(req.adminId as string, input));
});
