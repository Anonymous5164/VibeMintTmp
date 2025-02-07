"use server";

import prisma from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function createPost(content: string, image: string) {
  try {
    const userId = await getDbUserId();

    if (!userId) return;

    const post = await prisma.post.create({
      data: {
        content,
        image,
        authorId: userId,
      },
    });

    revalidatePath("/"); // purge the cache for the home page
    return { success: true, post };
  } catch (error) {
    console.error("Failed to create post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

export async function getPosts() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            username: true,
            walletAddress: true, // Web3: User's wallet address
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                image: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
        likes: {
          select: {
            userId: true,
          },
        },
        _count: {
          select: {
            likes: true,
            comments: true,
          },
        },
        nft: {  // Web3: NFT details if post is minted
          select: {
            id: true,
            tokenId: true,
            contractAddress: true,
            ownerId: true,
            price: true,
            forSale: true,
            chain: true,
            owner: { 
              select: {
                id: true,
                username: true,
                image: true,
                walletAddress: true, // Web3: NFT owner's wallet address
              },
            },
            bids: {  // Web3: Bids placed on this NFT
              select: {
                id: true,
                amount: true,
                status: true,
                createdAt: true,
                bidder: {
                  select: {
                    id: true,
                    username: true,
                    image: true,
                    walletAddress: true,
                  },
                },
              },
              orderBy: {
                amount: "desc", // Highest bid first
              },
            },
          },
        },
      },
    });

    return posts;
  } catch (error) {
    console.log("Error in getPosts", error);
    throw new Error("Failed to fetch posts");
  }
}
