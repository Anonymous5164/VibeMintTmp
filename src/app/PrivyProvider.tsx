"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { toSolanaWalletConnectors } from "@privy-io/react-auth/solana";

export default function PrivyProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {

  const solanaConnectors = toSolanaWalletConnectors({
    shouldAutoConnect: true,
  });

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID || ""}
      config={{
        appearance: {
          theme: "dark",
        },
        loginMethods: ['wallet'],
        embeddedWallets: {
          createOnLogin: "all-users",
        },
        externalWallets: {
          solana: { connectors: solanaConnectors },
        },
        solanaClusters: [
          {
            name: "mainnet-beta",
            rpcUrl:
              "https://nd-669-000-416.p2pify.com/62faa00d73650e0befd4df3b866659df",
          },
        ],
      }}
    >
      {children}
    </PrivyProvider>
  );
}
