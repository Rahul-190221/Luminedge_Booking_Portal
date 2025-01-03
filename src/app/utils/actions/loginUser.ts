'use server'
import { FormValues } from "@/app/login/page";

export const loginUser = async (formData: FormValues ) => {
    console.log(process.env.NEXT_PUBLIC_BACKEND_URL)
    console.log(formData);
    const res = await fetch(`https://luminedge-server.vercel.app/api/v1/login`,{
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData),
        cache: 'no-store',
    })
    const data = await res.json()
    return data
}