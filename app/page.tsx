import Link from "next/link";
import React from "react";

function Home() {
  return (
    <>
      <div className="w-full text-center p-12 flex flex-col items-center">
        <Link
          href="/game"
          className="text-2xl font-bold bg-[#6ead79] p-4 text-white rounded-md hover:bg-[#4d8750] cursor-pointer"
        >
          선 연결 게임하러 가기 버튼
        </Link>
        <Link
          href="/game2"
          className="mt-12 text-2xl font-bold bg-[#6ead79] p-4 text-white rounded-md hover:bg-[#4d8750] cursor-pointer"
        >
          도넛 게임하러 가기 버튼
        </Link>
      </div>
    </>
  );
}

export default Home;
