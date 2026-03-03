"use client"

import { useState } from 'react'
import DuneChart from '@/components/DuneChart'
import DuneBar from '@/components/DuneBar'

export default function DashboardPage(){

//   console.log('0000',process.env.DUNE_API_KEY, process.env.NEXT_PUBLIC_DUNE_API_KEY)
//   const options = {method: 'GET', headers: {'X-DUNE-API-KEY': process.env.DUNE_API_KEY}};

//   console.log('options---',options)
// fetch('https://api.dune.com/api/v1/query/4319/results', options)
//   .then(response => response.json())
//   .then(response => console.log(response))
//   .catch(err => console.error(err));

  return(
    <div className="flex justify-center">
      <div className="container py-6 px-2">
        <h1 className="text-3xl font-bold mb-6 dark:text-white">Dashboard</h1>
        <p className="text-gray-700 dark:text-gray-300">Overview of app statistics and Dune data.</p>
        <div className="mt-8 lg:grid lg:grid-cols-3 lg:gap-4">
          <div className="lg:col-span-1 mb-4 lg:mb-0">
            <DuneBar />
          </div>
          <div className="lg:col-span-2">
            <DuneChart />
          </div>
        </div>
      </div>
    </div>
  )
}