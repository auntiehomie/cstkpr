/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { signIn, signOut, getCsrfToken } from "next-auth/react";
import sdk, {
  SignIn as SignInCore,
} from "@farcaster/frame-sdk";
import {
  useAccount,
  useSendTransaction,
  useSignMessage,
  useSignTypedData,
  useWaitForTransactionReceipt,
  useDisconnect,
  useConnect,
  useSwitchChain,
  useChainId,
} from "wagmi";

import { useHasSolanaProvider } from "./providers/SafeFarcasterSolanaProvider";
// import { ShareButton } from "./ui/Share";

import { truncateAddress } from "../lib/truncateAddress";
import { base, degen, mainnet, optimism, unichain } from "wagmi/chains";
import { BaseError, UserRejectedRequestError } from "viem";
import { useSession } from "next-auth/react";
import { useMiniApp } from "@neynar/react";
// import { PublicKey, SystemProgram, Transaction } from '@solana/web3.js';

import { APP_NAME, USE_WALLET } from "../lib/constants";

export type Tab = 'home' | 'actions' | 'context' | 'wallet';

interface NeynarUser {
  fid: number;
  score: number;
}

export default function Demo(
  { title }: { title?: string } = { title: "Neynar Starter Kit" }
) {
  const {
    isSDKLoaded,
    context,
    added,
    notificationDetails,
    actions,
  } = useMiniApp();
  const [isContextOpen, setIsContextOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [txHash, setTxHash] = useState<string | null>(null);
  const [sendNotificationResult, setSendNotificationResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [neynarUser, setNeynarUser] = useState<NeynarUser | null>(null);

  const { address, isConnected } = useAccount();
  const chainId = useChainId();
// const hasSolanaProvider = useHasSolanaProvider();
// const solanaWallet = useSolanaWallet();
//  const { publicKey: solanaPublicKey } = solanaWallet;

  useEffect(() => {
    console.log("isSDKLoaded", isSDKLoaded);
    console.log("context", context);
    console.log("address", address);
    console.log("isConnected", isConnected);
    console.log("chainId", chainId);
  }, [context, address, isConnected, chainId, isSDKLoaded]);

  // Fetch Neynar user object when context is available
  useEffect(() => {
    const fetchNeynarUserObject = async () => {
      if (context?.user?.fid) {
        try {
          const response = await fetch(`/api/users?fids=${context.user.fid}`);
          const data = await response.json();
          if (data.users?.[0]) {
            setNeynarUser(data.users[0]);
          }
        } catch (error) {
          console.error('Failed to fetch Neynar user object:', error);
        }
      }
    };

    fetchNeynarUserObject();
  }, [context?.user?.fid]);

  const {
    sendTransaction,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: txHash as `0x${string}`,
    });

  const {
    signTypedData,
    error: signTypedError,
    isError: isSignTypedError,
    isPending: isSignTypedPending,
  } = useSignTypedData();

  const { disconnect } = useDisconnect();
  const { connect, connectors } = useConnect();

  const {
    switchChain,
    error: switchChainError,
    isError: isSwitchChainError,
    isPending: isSwitchChainPending,
  } = useSwitchChain();

  const nextChain = useMemo(() => {
    if (chainId === base.id) {
      return optimism;
    } else if (chainId === optimism.id) {
      return degen;
    } else if (chainId === degen.id) {
      return mainnet;
    } else if (chainId === mainnet.id) {
      return unichain;
    } else {
      return base;
    }
  }, [chainId]);

  const handleSwitchChain = useCallback(() => {
    switchChain({ chainId: nextChain.id });
  }, [switchChain, nextChain.id]);

  const sendNotification = useCallback(async () => {
    setSendNotificationResult("");
    if (!notificationDetails || !context) {
      return;
    }

    try {
      const response = await fetch("/api/send-notification", {
        method: "POST",
        mode: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fid: context.user.fid,
          notificationDetails,
        }),
      });

      if (response.status === 200) {
        setSendNotificationResult("Success");
        return;
      } else if (response.status === 429) {
        setSendNotificationResult("Rate limited");
        return;
      }

      const data = await response.text();
      setSendNotificationResult(`Error: ${data}`);
    } catch (error) {
      setSendNotificationResult(`Error: ${error}`);
    }
  }, [context, notificationDetails]);

  const sendTx = useCallback(() => {
    sendTransaction(
      {
        // call yoink() on Yoink contract
        to: "0x4bBFD120d9f352A0BEd7a014bd67913a2007a878",
        data: "0x9846cd9efc000023c0",
      },
      {
        onSuccess: (hash) => {
          setTxHash(hash);
        },
      }
    );
  }, [sendTransaction]);

  const signTyped = useCallback(() => {
    signTypedData({
      domain: {
        name: APP_NAME,
        version: "1",
        chainId,
      },
      types: {
        Message: [{ name: "content", type: "string" }],
      },
      message: {
        content: `Hello from ${APP_NAME}!`,
      },
      primaryType: "Message",
    });
  }, [chainId, signTypedData]);

  const toggleContext = useCallback(() => {
    setIsContextOpen((prev) => !prev);
  }, []);

  if (!isSDKLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div
      style={{
        paddingTop: context?.client.safeAreaInsets?.top ?? 0,
        paddingBottom: context?.client.safeAreaInsets?.bottom ?? 0,
        paddingLeft: context?.client.safeAreaInsets?.left ?? 0,
        paddingRight: context?.client.safeAreaInsets?.right ?? 0,
      }}
    >
      <div className="mx-auto py-2 px-4 pb-20">
        {/* <Header neynarUser={neynarUser} /> */}

        <h1 className="text-2xl font-bold text-center mb-4">{title}</h1>

        {activeTab === 'home' && (
          <div className="flex items-center justify-center h-[calc(100vh-200px)] px-6">
            <div className="text-center w-full max-w-md mx-auto">
              <p className="text-lg mb-2">Put your content here!</p>
              <p className="text-sm text-gray-500">Powered by Neynar 🪐</p>
            </div>
          </div>
        )}

        {activeTab === 'actions' && (
          <div className="space-y-3 px-6 w-full max-w-md mx-auto">
            {/* <ShareButton 
              buttonText="Share Mini App"
              cast={{
                text: "Check out this awesome frame @1 @2 @3! 🚀🪐",
                bestFriends: true,
                embeds: [`${process.env.NEXT_PUBLIC_URL}/share/${context?.user?.fid || ''}`]
              }}
              className="w-full"
            /> */}

            <SignIn />

            <button onClick={() => actions.openUrl("https://www.youtube.com/watch?v=dQw4w9WgXcQ")} className="w-full px-4 py-2 bg-blue-500 text-white rounded">Open Link</button>

            <button onClick={actions.close} className="w-full px-4 py-2 bg-blue-500 text-white rounded">Close Mini App</button>

            <button onClick={actions.addMiniApp} disabled={added} className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
              Add Mini App to Client
            </button>

            {sendNotificationResult && (
              <div className="text-sm w-full">
                Send notification result: {sendNotificationResult}
              </div>
            )}
            <button onClick={sendNotification} disabled={!notificationDetails} className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
              Send notification
            </button>

            <button 
              onClick={async () => {
                if (context?.user?.fid) {
                  const shareUrl = `${process.env.NEXT_PUBLIC_URL}/share/${context.user.fid}`;
                  await navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }
              }}
              disabled={!context?.user?.fid}
              className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
            >
              {copied ? "Copied!" : "Copy share URL"}
            </button>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="mx-6">
            <h2 className="text-lg font-semibold mb-2">Context</h2>
            <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <pre className="font-mono text-xs whitespace-pre-wrap break-words w-full">
                {JSON.stringify(context, null, 2)}
              </pre>
            </div>
          </div>
        )}

        {activeTab === 'wallet' && USE_WALLET && (
          <div className="space-y-3 px-6 w-full max-w-md mx-auto">
            {address && (
              <div className="text-xs w-full">
                Address: <pre className="inline w-full">{address}</pre>
              </div>
            )}

            {chainId && (
              <div className="text-xs w-full">
                Chain ID: <pre className="inline w-full">{chainId}</pre>
              </div>
            )}

            {/* Commented out wallet functionality since USE_WALLET is false */}
            {/* {isConnected ? (
              <button
                onClick={() => disconnect()}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded"
              >
                Disconnect
              </button>
            ) : context ? (
              <button
                onClick={() => connect({ connector: connectors[0] })}
                className="w-full px-4 py-2 bg-blue-500 text-white rounded"
              >
                Connect
              </button>
            ) : (
              <div className="space-y-3 w-full">
                <button
                  onClick={() => connect({ connector: connectors[1] })}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Connect Coinbase Wallet
                </button>
                <button
                  onClick={() => connect({ connector: connectors[2] })}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded"
                >
                  Connect MetaMask
                </button>
              </div>
            )}

            <SignEvmMessage />

            {isConnected && (
              <>
                <SendEth />
                <button
                  onClick={sendTx}
                  disabled={!isConnected || isSendTxPending}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  Send Transaction (contract)
                </button>
                {isSendTxError && renderError(sendTxError)}
                {txHash && (
                  <div className="text-xs w-full">
                    <div>Hash: {truncateAddress(txHash)}</div>
                    <div>
                      Status:{" "}
                      {isConfirming
                        ? "Confirming..."
                        : isConfirmed
                        ? "Confirmed!"
                        : "Pending"}
                    </div>
                  </div>
                )}
                <button
                  onClick={signTyped}
                  disabled={!isConnected || isSignTypedPending}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  Sign Typed Data
                </button>
                {isSignTypedError && renderError(signTypedError)}
                <button
                  onClick={handleSwitchChain}
                  disabled={isSwitchChainPending}
                  className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
                >
                  Switch to {nextChain.name}
                </button>
                {isSwitchChainError && renderError(switchChainError)}
              </>
            )} */}
          </div>
        )}

        {/* <Footer activeTab={activeTab} setActiveTab={setActiveTab} showWallet={USE_WALLET} /> */}
        
        {/* Temporary simple navigation */}
        <div className="fixed bottom-0 left-0 right-0 flex justify-around p-4 bg-white border-t">
          <button onClick={() => setActiveTab('home')} className={`px-4 py-2 ${activeTab === 'home' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}>
            🏠 Home
          </button>
          <button onClick={() => setActiveTab('actions')} className={`px-4 py-2 ${activeTab === 'actions' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}>
            ⚡ Actions
          </button>
          <button onClick={() => setActiveTab('context')} className={`px-4 py-2 ${activeTab === 'context' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}>
            📋 Context
          </button>
          {USE_WALLET && (
            <button onClick={() => setActiveTab('wallet')} className={`px-4 py-2 ${activeTab === 'wallet' ? 'bg-blue-500 text-white' : 'bg-gray-200'} rounded`}>
              💰 Wallet
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Commented out Solana functions since we're not using them
/*
function SignSolanaMessage({ signMessage }: { signMessage?: (message: Uint8Array) => Promise<Uint8Array> }) {
  const [signature, setSignature] = useState<string | undefined>();
  const [signError, setSignError] = useState<Error | undefined>();
  const [signPending, setSignPending] = useState(false);

  const handleSignMessage = useCallback(async () => {
    setSignPending(true);
    try {
      if (!signMessage) {
        throw new Error('no Solana signMessage');
      }
      const input = new TextEncoder().encode("Hello from Solana!");
      const signatureBytes = await signMessage(input);
      const signature = btoa(String.fromCharCode(...signatureBytes));
      setSignature(signature);
      setSignError(undefined);
    } catch (e) {
      if (e instanceof Error) {
        setSignError(e);
      }
    } finally {
      setSignPending(false);
    }
  }, [signMessage]);

  return (
    <>
      <button
        onClick={handleSignMessage}
        disabled={signPending}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {signPending ? 'Loading...' : 'Sign Message'}
      </button>
      {signError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

function SendSolana() {
  const [state, setState] = useState<
    | { status: 'none' }
    | { status: 'pending' }
    | { status: 'error'; error: Error }
    | { status: 'success'; signature: string }
  >({ status: 'none' });

  const { connection: solanaConnection } = useSolanaConnection();
  const { sendTransaction, publicKey } = useSolanaWallet();

  const ashoatsPhantomSolanaWallet = 'Ao3gLNZAsbrmnusWVqQCPMrcqNi6jdYgu8T6NCoXXQu1';

  const handleSend = useCallback(async () => {
    setState({ status: 'pending' });
    try {
      if (!publicKey) {
        throw new Error('no Solana publicKey');
      }

      const { blockhash } = await solanaConnection.getLatestBlockhash();
      if (!blockhash) {
        throw new Error('failed to fetch latest Solana blockhash');
      }

      const fromPubkeyStr = publicKey.toBase58();
      const toPubkeyStr = ashoatsPhantomSolanaWallet;
      const transaction = new Transaction();
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: new PublicKey(fromPubkeyStr),
          toPubkey: new PublicKey(toPubkeyStr),
          lamports: 0n,
        }),
      );
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = new PublicKey(fromPubkeyStr);

      const simulation = await solanaConnection.simulateTransaction(transaction);
      if (simulation.value.err) {
        const logs = simulation.value.logs?.join('\n') ?? 'No logs';
        const errDetail = JSON.stringify(simulation.value.err);
        throw new Error(`Simulation failed: ${errDetail}\nLogs:\n${logs}`);
      }
      const signature = await sendTransaction(transaction, solanaConnection);
      setState({ status: 'success', signature });
    } catch (e) {
      if (e instanceof Error) {
        setState({ status: 'error', error: e });
      } else {
        setState({ status: 'none' });
      }
    }
  }, [sendTransaction, publicKey, solanaConnection]);

  return (
    <>
      <button
        onClick={handleSend}
        disabled={state.status === 'pending'}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {state.status === 'pending' ? 'Loading...' : 'Send Transaction (sol)'}
      </button>
      {state.status === 'error' && renderError(state.error)}
      {state.status === 'success' && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(state.signature)}</div>
        </div>
      )}
    </>
  );
}
*/

// Commented out EVM functions since we're not using wallet functionality
/*
function SignEvmMessage() {
  const { isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const {
    signMessage,
    data: signature,
    error: signError,
    isError: isSignError,
    isPending: isSignPending,
  } = useSignMessage();

  const handleSignMessage = useCallback(async () => {
    if (!isConnected) {
      await connectAsync({
        chainId: base.id,
        connector: config.connectors[0],
      });
    }

    signMessage({ message: `Hello from ${APP_NAME}!` });
  }, [connectAsync, isConnected, signMessage]);

  return (
    <>
      <button
        onClick={handleSignMessage}
        disabled={isSignPending}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isSignPending ? 'Loading...' : 'Sign Message'}
      </button>
      {isSignError && renderError(signError)}
      {signature && (
        <div className="mt-2 text-xs">
          <div>Signature: {signature}</div>
        </div>
      )}
    </>
  );
}

function SendEth() {
  const { isConnected, chainId } = useAccount();
  const {
    sendTransaction,
    data,
    error: sendTxError,
    isError: isSendTxError,
    isPending: isSendTxPending,
  } = useSendTransaction();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash: data,
    });

  const toAddr = useMemo(() => {
    return chainId === base.id
      ? "0x32e3C7fD24e175701A35c224f2238d18439C7dBC"
      : "0xB3d8d7887693a9852734b4D25e9C0Bb35Ba8a830";
  }, [chainId]);

  const handleSend = useCallback(() => {
    sendTransaction({
      to: toAddr,
      value: 1n,
    });
  }, [toAddr, sendTransaction]);

  return (
    <>
      <button
        onClick={handleSend}
        disabled={!isConnected || isSendTxPending}
        className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
      >
        {isSendTxPending ? 'Loading...' : 'Send Transaction (eth)'}
      </button>
      {isSendTxError && renderError(sendTxError)}
      {data && (
        <div className="mt-2 text-xs">
          <div>Hash: {truncateAddress(data)}</div>
          <div>
            Status:{" "}
            {isConfirming
              ? "Confirming..."
              : isConfirmed
              ? "Confirmed!"
              : "Pending"}
          </div>
        </div>
      )}
    </>
  );
}
*/

function SignIn() {
  const [signingIn, setSigningIn] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signInResult, setSignInResult] = useState<SignInCore.SignInResult>();
  const [signInFailure, setSignInFailure] = useState<string>();
  const { data: session, status } = useSession();

  const getNonce = useCallback(async () => {
    const nonce = await getCsrfToken();
    if (!nonce) throw new Error("Unable to generate nonce");
    return nonce;
  }, []);

  const handleSignIn = useCallback(async () => {
    try {
      setSigningIn(true);
      setSignInFailure(undefined);
      const nonce = await getNonce();
      const result = await sdk.actions.signIn({ nonce });
      setSignInResult(result);

      await signIn("credentials", {
        message: result.message,
        signature: result.signature,
        redirect: false,
      });
    } catch (e) {
      if (e instanceof SignInCore.RejectedByUser) {
        setSignInFailure("Rejected by user");
        return;
      }

      setSignInFailure("Unknown error");
    } finally {
      setSigningIn(false);
    }
  }, [getNonce]);

  const handleSignOut = useCallback(async () => {
    try {
      setSigningOut(true);
      await signOut({ redirect: false });
      setSignInResult(undefined);
    } finally {
      setSigningOut(false);
    }
  }, []);

  return (
    <>
      {status !== "authenticated" && (
        <button onClick={handleSignIn} disabled={signingIn} className="w-full px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
          Sign In with Farcaster
        </button>
      )}
      {status === "authenticated" && (
        <button onClick={handleSignOut} disabled={signingOut} className="w-full px-4 py-2 bg-red-500 text-white rounded disabled:opacity-50">
          Sign out
        </button>
      )}
      {session && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">Session</div>
          <div className="whitespace-pre">
            {JSON.stringify(session, null, 2)}
          </div>
        </div>
      )}
      {signInFailure && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">{signInFailure}</div>
        </div>
      )}
      {signInResult && !signingIn && (
        <div className="my-2 p-2 text-xs overflow-x-scroll bg-gray-100 rounded-lg font-mono">
          <div className="font-semibold text-gray-500 mb-1">SIWF Result</div>
          <div className="whitespace-pre">
            {JSON.stringify(signInResult, null, 2)}
          </div>
        </div>
      )}
    </>
  );
}

const renderError = (error: Error | null) => {
  if (!error) return null;
  if (error instanceof BaseError) {
    const isUserRejection = error.walk(
      (e) => e instanceof UserRejectedRequestError
    );

    if (isUserRejection) {
      return <div className="text-red-500 text-xs mt-1">Rejected by user.</div>;
    }
  }

  return <div className="text-red-500 text-xs mt-1">{error.message}</div>;
};