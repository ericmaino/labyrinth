# Azure Sample Graphs

Write something useful here soon.

### Testing New Graph
- Create a folder under examples
- Use the following command to generate a graph. Scope it to the appropriate resource group or groups
  ```
  az graph query -q 'Resources | where type !in ("microsoft.compute/virtualmachines/extensions", "microsoft.compute/disks", "microsoft.compute/sshpublickeys", "microsoft.storage/storageaccounts")' 
  ```
- Save the output as a file called `resource-graph.json` within the new folder
- Execute `run.cmd` from within the Examples directory

## Sample Graphs
Most of these graphs were generated from the same base and were ordered so they can be diffed against each other.

### graph-backend-multi-subnet
The key traits about this is that it contains a public load balancer which is routing to IPs in different subnets

### graph-basic-public-lb
This graph constains a simple standard load balancer

### graph-ilb-plb-multiple-routes
A graph with both internal and public load balancers that both contain multiple routes

### graph-ilb-plb-overlapping-vnet
A graph where two subnets have the exact same address space

### graph-ilb-vm
A graph where an internal load balancer is routing to a VM

### graph-ilb-vmss
A graph where an internal load balancer is routing to a VM Scale Set
- This one is intersting as synethic NIC and IP configurations must be generated
  
### graph-internet-routing
A graph containing a Public IP where Internet routing is preferred over Azure Backbone routing

### graph-multiple-outbound-ips
A graph with a load balancer and a client which also has it's own public IP