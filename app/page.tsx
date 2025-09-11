import Link from "next/link";
import React from "react";

function Home() {
  return (
    <>
      <div className="w-full text-center p-12">
        <Link
          href="/game"
          className="text-2xl font-bold bg-[#6ead79] p-4 text-white rounded-md hover:bg-[#4d8750] cursor-pointer"
        >
          게임하러 가기 버튼
        </Link>
      </div>
    </>
  );
}

export default Home;
