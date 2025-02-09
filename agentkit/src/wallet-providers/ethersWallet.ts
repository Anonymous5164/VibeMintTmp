import { ethers } from "ethers";
import { EvmWalletProvider } from "./evmWalletProvider"; // Adjust path as needed
import { TransactionRequest, ReadContractParameters, ReadContractReturnType } from "viem";

// Mock implementation using ethers.js
export class EthersWalletProvider extends EvmWalletProvider {
  private wallet: ethers.Wallet;
  private provider: ethers.JsonRpcProvider;

  constructor(privateKey: string, rpcUrl: string) {
    super();
    this.provider = new ethers.JsonRpcProvider(rpcUrl);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
  }

  getAddress(): string {
    return this.wallet.address;
  }

  async signMessage(message: string | Uint8Array): Promise<`0x${string}`> {
    const signature = await this.wallet.signMessage(message);
    return signature as `0x${string}`;
  }

  async signTypedData(typedData: any): Promise<`0x${string}`> {
    // Implement signing typed data (EIP-712) if needed.  This is highly dependent on the 'ethers' version.
    throw new Error("Method not implemented: signTypedData");
  }

  async signTransaction(transaction: TransactionRequest): Promise<`0x${string}`> {
    // Convert viem TransactionRequest to ethers.js transaction
    const ethersTransaction: ethers.Transaction = {
      to: transaction.to as string,
      from: transaction.from as string,
      nonce: transaction.nonce,
      gasLimit: transaction.gas,
      gasPrice: transaction.gasPrice,
      data: transaction.data as string,
      value: transaction.value,
      chainId: transaction.chainId,
      type: transaction.type,
      accessList: transaction.accessList,
      maxPriorityFeePerGas: transaction.maxPriorityFeePerGas,
      maxFeePerGas: transaction.maxFeePerGas,
    } as ethers.Transaction

    const signedTransaction = await this.wallet.signTransaction(ethersTransaction);
    return signedTransaction as `0x${string}`;
  }

  async sendTransaction(transaction: TransactionRequest): Promise<`0x${string}`> {

    const signedTransaction = await this.signTransaction(transaction);
    const txResponse = await this.provider.sendTransaction(signedTransaction);
    return txResponse.hash as `0x${string}`;
  }

  async waitForTransactionReceipt(txHash: `0x${string}`): Promise<any> {
    return await this.provider.waitForTransaction(txHash);
  }

  async readContract(params: ReadContractParameters): Promise<ReadContractReturnType> {
      const contract = new ethers.Contract(
          params.address as string,
          params.abi,
          this.provider,
      );

      // Adapt the viem arguments to the ethers.js call
      const result = await contract[params.functionName](...params.args || []);
      return result;
  }
}
