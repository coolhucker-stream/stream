FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 443

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["Streaming.csproj", "."]
RUN dotnet restore "./Streaming.csproj"
COPY . .
WORKDIR "/src/."
# Disable creating an apphost during build to avoid copying executable permission issues in the container
RUN dotnet build "Streaming.csproj" -c Release -o /app/build /p:UseAppHost=false

FROM build AS publish
RUN dotnet publish "Streaming.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENTRYPOINT ["dotnet", "Streaming.dll"]