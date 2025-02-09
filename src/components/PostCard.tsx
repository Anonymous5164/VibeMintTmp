"use client";

import { createComment, deletePost, getPosts, toggleLike } from "@/actions/post.action";
import { SignInButton, useUser } from "@clerk/nextjs";
import { useState } from "react";
import toast from "react-hot-toast";
import { Card, CardContent } from "./ui/card";
import Link from "next/link";
import { Avatar, AvatarImage } from "./ui/avatar";
import { formatDistanceToNow } from "date-fns";
import { DeleteAlertDialog } from "./DeleteAlertDialog";
import { Button } from "./ui/button";
import { HeartIcon, LogInIcon, MessageCircleIcon, SendIcon } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { ethers } from "ethers";
import { CONTRACT_ABI } from "../lib/abi";
import { getDbUserId, getImageUrl } from "@/actions/user.action";
import { PrivyClient, usePrivy } from '@privy-io/react-auth';

// Replace with your contract address
const CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS || "";

type Posts = Awaited<ReturnType<typeof getPosts>>;
type Post = Posts[number];

function PostCard({ post, dbUserId }: { post: Post; dbUserId: string | null }) {
  const { user } = useUser();
  const [newComment, setNewComment] = useState("");
  const [isCommenting, setIsCommenting] = useState(false);
  const [isLiking, setIsLiking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasLiked, setHasLiked] = useState(post.likes.some((like) => like.userId === dbUserId));
  const [optimisticLikes, setOptmisticLikes] = useState(post._count.likes);
  const [showComments, setShowComments] = useState(false);

  // State Variables for minting, buying and bidding(Jay)
  const [isMinted, setIsMinted] = useState(!!post.nft);
  const [isMinting, setIsMinting] = useState(false);
  const [isPostOwner, setIsPostOwner] = useState(dbUserId === post.author.id);
  const [isNFTBuyer, setIsNFTBuyer] = useState(post.nft && dbUserId !== post.nft.ownerId);
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState("");

  const { ready, authenticated, user: privyUser, getLinkedAccounts, login, logout, signMessage } = usePrivy();

  // To handle Minting(Jay)
  const handleMintPost = async () => {
    if (isMinting) return;
    const imageUrl = await getImageUrl(getDbUserId());
    console.log(imageUrl)
    try {
      setIsMinting(true);
      setLoading(true);
      setOutput("Minting...");

      // Check if Privy is ready
      if (!ready) {
        setOutput("Privy is not ready yet. Please try again later.");
        toast.error("Privy is not ready yet. Please try again later.");
        return;
      }

      // Check if user is authenticated
      if (!authenticated) {
        setOutput("Please connect your wallet using Privy.");
        toast.error("Please connect your wallet using Privy.");
        await login(); // You can trigger the login flow here
        return;
      }

      // Get the linked Ethereum accounts from Privy
      const linkedAccounts = await getLinkedAccounts();

      // Check if any accounts are linked
      if (!linkedAccounts || linkedAccounts.length === 0) {
        setOutput("No Ethereum wallets connected to Privy. Please connect a wallet.");
        toast.error("No Ethereum wallets connected to Privy. Please connect a wallet.");
        return;
      }

      // Get the first linked Ethereum address (you might want to let the user choose)
      const userAddress = linkedAccounts[0];

      // Sign the message using Privy
      const messageToSign = "Minting Post";  // Define a non-empty message
      const signature = await signMessage(messageToSign); // Sign the message
      if (!signature) {
        setOutput("Failed to sign minting message.");
        toast.error("Failed to sign minting message.");
        return;
      }

      // Create a custom signer using the signature
      const signer = {
        getAddress: () => Promise.resolve(userAddress),
        signMessage: (message: string) => Promise.resolve(signature),
        _isSigner: true,
      };

      const gasLimit = 300000;

      // Create a contract instance
      const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer as any);

      // Call the mint function on the contract
      const transaction = await contract.mint(userAddress, imageUrl, gasLimit);

      setOutput(`Minting... (Transaction Hash: ${transaction.hash})`);
      toast.success(`Minting... (Transaction Hash: ${transaction.hash})`);

      // Wait for the transaction to be confirmed
      await transaction.wait();

      setOutput("Post minted successfully!");
      toast.success("Post minted successfully!");
      setIsMinted(true);

    } catch (error: any) {
      console.error("Error minting post:", error);
      setOutput(`Minting failed: ${error.message || error}`);
      toast.error(`Minting failed: ${error.message || error}`);
    } finally {
      setIsMinting(false);
      setLoading(false);
    }
  };

  // To handle Buying NFT(Jay)
  const handleBuyNFT = async () => {
    console.log("Buy NFT function - Yet to implement");
    // TODO: Implement NFT purchase logic
    // Transfer ownership on blockchain
    // Update database with new NFT owner

    // Simulating ownership transfer (replace with actual owner update)
    setIsPostOwner(true);
    setIsNFTBuyer(false);
  };

  // To handle Bidding on NFT(Jay)
  const handleBidNFT = async () => {
    console.log("Bid NFT function - Yet to implement");
    // TODO: Implement bid placement logic
    // Call smart contract to place a bid
    // Update database with bid details
  };

  const handleLike = async () => {
    if (isLiking) return;
    try {
      setIsLiking(true);
      setHasLiked((prev) => !prev);
      setOptmisticLikes((prev) => prev + (hasLiked ? -1 : 1));
      await toggleLike(post.id);
    } catch (error) {
      setOptmisticLikes(post._count.likes);
      setHasLiked(post.likes.some((like) => like.userId === dbUserId));
    } finally {
      setIsLiking(false);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || isCommenting) return;
    try {
      setIsCommenting(true);
      const result = await createComment(post.id, newComment);
      if (result?.success) {
        toast.success("Comment posted successfully");
        setNewComment("");
      }
    } catch (error) {
      toast.error("Failed to add comment");
    } finally {
      setIsCommenting(false);
    }
  };

  const handleDeletePost = async () => {
    if (isDeleting) return;
    try {
      setIsDeleting(true);
      const result = await deletePost(post.id);
      if (result.success) toast.success("Post deleted successfully");
      else throw new Error(result.error);
    } catch (error) {
      toast.error("Failed to delete post");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-4">
          <div className="flex space-x-3 sm:space-x-4">
            <Link href={`/profile/${post.author.username}`}>
              <Avatar className="size-8 sm:w-10 sm:h-10">
                <AvatarImage src={post.author.image ?? "/avatar.png"} />
              </Avatar>
            </Link>

            {/* POST HEADER & TEXT CONTENT */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2 truncate">
                  <Link
                    href={`/profile/${post.author.username}`}
                    className="font-semibold truncate"
                  >
                    {post.author.name}
                  </Link>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Link href={`/profile/${post.author.username}`}>@{post.author.username}</Link>
                    <span>•</span>
                    <span>{formatDistanceToNow(new Date(post.createdAt))} ago</span>
                  </div>
                </div>
                {/* Check if current user is the post author */}
                {dbUserId === post.author.id && (
                  <DeleteAlertDialog isDeleting={isDeleting} onDelete={handleDeletePost} />
                )}
              </div>
              <p className="mt-2 text-sm text-foreground break-words">{post.content}</p>
            </div>
          </div>

          {/* POST IMAGE */}
          {post.image && (
            <div className="rounded-lg overflow-hidden">
              <img src={post.image} alt="Post content" className="w-full h-auto object-cover" />
            </div>
          )}

          {/* LIKE, COMMENT, MINT, BUY, BID BUTTONS - ALL IN ONE LINE */}
          <div className="flex items-center pt-2 space-x-4">
            {user ? (
              <Button
                variant="ghost"
                size="sm"
                className={`text-muted-foreground gap-2 ${
                  hasLiked ? "text-red-500 hover:text-red-600" : "hover:text-red-500"
                }`}
                onClick={handleLike}
              >
                {hasLiked ? <HeartIcon className="size-5 fill-current" /> : <HeartIcon className="size-5" />}
                <span>{optimisticLikes}</span>
              </Button>
            ) : (
              <SignInButton mode="modal">
                <Button variant="ghost" size="sm" className="text-muted-foreground gap-2">
                  <HeartIcon className="size-5" />
                  <span>{optimisticLikes}</span>
                </Button>
              </SignInButton>
            )}

            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground gap-2 hover:text-blue-500"
              onClick={() => setShowComments((prev) => !prev)}
            >
              <MessageCircleIcon className={`size-5 ${showComments ? "fill-blue-500 text-blue-500" : ""}`} />
              <span>{post.comments.length}</span>
            </Button>

            {/* MINT, BUY, BID BUTTONS ON THE SAME LINE */}
            {isPostOwner && !isMinted && (
              <Button onClick={handleMintPost} disabled={isMinting} className="bg-green-500 text-white text-sm">
                {isMinting ? "Minting..." : "Mint"}
              </Button>
            )}
            {isNFTBuyer && (
              <>
                <Button onClick={handleBuyNFT} className="bg-blue-500 text-white text-sm">
                  Buy
                </Button>
                <Button onClick={handleBidNFT} className="bg-yellow-500 text-white text-sm">
                  Bid
                </Button>
              </>
            )}
          </div>

          {/* COMMENTS SECTION */}
          {showComments && (
            <div className="space-y-4 pt-4 border-t">
              <div className="space-y-4">
                {/* DISPLAY COMMENTS */}
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <Avatar className="size-8 flex-shrink-0">
                      <AvatarImage src={comment.author.image ?? "/avatar.png"} />
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="font-medium text-sm">{comment.author.name}</span>
                        <span className="text-sm text-muted-foreground">@{comment.author.username}</span>
                        <span className="text-sm text-muted-foreground">·</span>
                        <span className="text-sm text-muted-foreground">
                          {formatDistanceToNow(new Date(comment.createdAt))} ago
                        </span>
                      </div>
                      <p className="text-sm break-words">{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              {user ? (
                <div className="flex space-x-3">
                  <Avatar className="size-8 flex-shrink-0">
                    <AvatarImage src={user?.imageUrl || "/avatar.png"} />
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      placeholder="Write a comment..."
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      className="min-h-[80px] resize-none"
                    />
                    <div className="flex justify-end mt-2">
                      <Button
                        size="sm"
                        onClick={handleAddComment}
                        className="flex items-center gap-2"
                        disabled={!newComment.trim() || isCommenting}
                      >
                        {isCommenting ? (
                          "Posting..."
                        ) : (
                          <>
                            <SendIcon className="size-4" />
                            Comment
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center p-4 border rounded-lg bg-muted/50">
                  <SignInButton mode="modal">
                    <Button variant="outline" className="gap-2">
                      <LogInIcon className="size-4" />
                      Sign in to comment
                    </Button>
                  </SignInButton>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PostCard;
