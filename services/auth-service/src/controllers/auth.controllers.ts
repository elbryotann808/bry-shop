import type { Request, Response } from "express"
import { prisma } from "../db.js"; 
import bcrypt from "bcrypt";
import crypto from "crypto";
import { signJwt } from "../services/jwt.service.js";
import { 
  createSession,
  findsessionByToken,
  revokeSessionByToken
 } from "../services/session.service.js";

const SALT_ROUNDS = 10;
const REFRESH_TOKEN_EXPIRES_DAYS = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS ?? 7)


const makeRefreshToken = ()=> crypto.randomBytes(64).toString("hex")

const setRefreshCookie = (res: Response, token: string) =>{
  const maxAge = REFRESH_TOKEN_EXPIRES_DAYS * 24 * 60 * 60 * 1000
  res.cookie("refreshToken", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  })

}



export const registerUser = async(req: Request, res: Response) => {
  try {
    const {name, email, password} = req.body
    if (!name || !email || !password) res.status(400).json({message: "All fields are required"})

    const existingEmail = await prisma.user.findUnique({where: {email}})
    if (existingEmail) res.status(409).json({message: "Email already registered"})

    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS) 

    const user = await prisma.user.create({
      data: { name, email, password: hashedPassword },
      select: { id: true, name: true, email: true, createdAt: true },
    })

    const accessToken = signJwt({sub: String(user.id), email: user.email})
    const refreshToken = makeRefreshToken()

    await createSession({
      userId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"] ?? null,
      ip: req.ip ?? null,
    })

    setRefreshCookie(res, refreshToken)

    return res.status(201).json({user, accessToken})

  } catch (error) {
    console.log(error);
    return res.status(500).json({message: 'internal server error'})
  }
}

export const loginUser = async (req: Request, res: Response) => {
  try {
    if (!req.body || typeof req.body !=="object") {
      return res.status(400).json({ mesage: "Invalid request body"})
    }
  
    const { email, password } = req.body as {email?: string; password?: string}
    if (!email || !password) return res.status(400).json({message: "Missing fields"}) 
    
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, name: true, createdAt: true}
    })

    if (!user) return res.status(401).json({ message: "Invalid credentials"})

    const passwordMatches = await bcrypt.compare(password, user.password)
    if (!passwordMatches) return res.status(401).json({message: "Invalid credentials"})

    const accessToken = signJwt({ sub: String(user.id), email: user.email })
    const refreshToken = makeRefreshToken()

    await createSession({
      userId: user.id,
      refreshToken,
      userAgent: req.headers["user-agent"] ?? null,
      ip: req.ip ?? null
    })

    setRefreshCookie(res, refreshToken)
 
    const userSafe = { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt }
    return res.json({ message: "Logged in", user: userSafe, accessToken })
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "internal server error" });
  }
} 

export const refreshToken = async (req: Request, res: Response) =>{
  try {
    const refreshToken = 
    (req.cookies && req.cookies.refreshToken) ||
    (req.body && req.body.refreshToken) ||
    (req.headers.authorization && String(req.headers.authorization).split(" ")[1]) 

    if (!refreshToken) return res.status(401).json({ mesage: "Missing refresh token" })

    const session = await findsessionByToken(String(refreshToken))
    if (!session || session.revoked ) {
      return res.status(401).json({ message: "Invalid or revoked refresh token" })
    }

    const accessToken = signJwt({ sub: String(session.userId)})

    const newRefreshToken = makeRefreshToken()
    await prisma.session.update({
      where: { id: session.id },
      data: { refreshToken: newRefreshToken }
    })

    setRefreshCookie(res, newRefreshToken)
    return res.json({ accessToken })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Internal server error"})
  }
}

export const  logoutUser = async (req: Request, res: Response) =>{
  try {
     const refreshToken = 
    (req.cookies && req.cookies.refreshToken) ||
    (req.body && req.body.refreshToken) ||
    (req.headers.authorization && String(req.headers.authorization).split(" ")[1]) 

    if (refreshToken) await revokeSessionByToken(String(refreshToken))

    res.clearCookie("refreshToken", {
      httpOnly: true, 
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    })

    return res.status(200).json({ message: "Logged out"})
  } catch (error) {
    console.error("logout error", error);
    return res.status(500).json({ message: "internal server error" });
  }
}

export const getMe = async (req: Request, res: Response) =>{
  try {
    const payLoad = (req as unknown as { user?: {sub: string}}).user
    if (!payLoad || !payLoad.sub) res.status(401).json({ message: "Unauthorized"})

    const userId = Number(payLoad?.sub)
    const user = await prisma.user.findUnique({
      where: {id: userId},
      select: { id: true, email: true, name: true, role: true }
    })
    
    if (!user) return res.status(404).json({ message: "User not found"}) 

    return res.json(user)
  } catch (error) {
    console.error("getMe error", error)
    return res.status(500).json({ message: "Internal server error" })
  }
}


// test conection whit data base 
export const testConection = async(req: Request, res: Response) => {
   console.log("stast conection database...");
   const r = await prisma.$queryRaw`SELECT NOW()`;
   res.send(r)
   console.log(r);
}