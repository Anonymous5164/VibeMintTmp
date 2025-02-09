import prisma from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";


export async function POST(req:NextRequest){
    const body = await req.json();
    const { username, walletAddress } = body;
    
    if(!walletAddress){
        return NextResponse.json({
            message: "Invalid inputs",
        },{
            status:411
        })
    }

    const response = await prisma.user.update({
        where:{
            username
        },
        data:{
            walletAddress
        }
    })
}