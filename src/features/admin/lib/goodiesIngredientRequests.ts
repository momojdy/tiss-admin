type RequestClient = {rpc:(name:string,args:Record<string,unknown>)=>PromiseLike<{data:unknown;error:unknown}>};

/** Builder ingredient selection must not stop at the legacy first 200 requests. */
export async function loadAllGoodiesIngredientRequests(client:RequestClient):Promise<any[]> {
  const rows:any[]=[],ids=new Set<string>(),size=50;
  for(let offset=0;;offset+=size){
    const response=await client.rpc('wantiss_admin_list_ingredient_requests_page',{p_offset:offset,p_limit:size,p_waiting:false});
    if(response.error||!Array.isArray(response.data)||response.data.length>size)throw Error('Ingredient requests could not be loaded.');
    for(const row of response.data){
      if(!row||typeof row.id!=='string'||ids.has(row.id))throw Error('Ingredient requests changed while loading. Please retry.');
      ids.add(row.id);rows.push(row);
    }
    if(response.data.length<size)return rows;
  }
}
