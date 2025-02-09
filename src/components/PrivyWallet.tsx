"use client";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Button } from "./ui/button";
import axios from "axios";
import { updateWalletAddress } from "@/actions/user.action";
export default function PrivyWallet(){
    const router = useRouter();
    const { ready, authenticated, login, user, logout } = usePrivy();

  useEffect(() => {
    const newFunction = async () => {
        if (ready && authenticated) {
        //     const response = await axios.post( "/api/walletConnect",{
        //         walletAddress: user?.wallet?.address
        //     })
        //   console.log(response)
        // const [walletAddress] = await Promise.all([updateWalletAddress()])
          console.log(user)
        }
    }
    newFunction();

  }, [ready, authenticated, router]);
  return (
    <div>
        {
          ready && authenticated ? (
            <Button
            onClick={logout}
            className="text-sm bg-violet-200 hover:text-violet-900 py-2 px-4 rounded-md text-violet-700"
          >
            Disconnect
          </Button>
          ): (
            <Button
            className="bg-violet-600 hover:bg-violet-700 py-3 px-6 text-white rounded-lg"
            onClick={login}
            disabled={!ready || authenticated}
          >
            Connect
          </Button>
          )
        }
    </div>
  )
}